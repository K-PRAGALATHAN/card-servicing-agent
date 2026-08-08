"""Coordinator agent — the orchestrator.

The only agent that talks to the customer. It runs the guardrails, routes each
message to a specialist lane, keeps the confirm-before-execute spine, and writes
the audit trail. The deterministic PolicyEngine still makes every servicing
decision; the LLM only converses, routes, and (for reads) fetches grounded data.

    injection guard → PII-redact → route → {accounts | transactions | servicing}
        servicing: resolve real slots (read tools) → policy → confirm → execute (write tool) → audit
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.adapters.inbound.http.auth import AuthContext
from app.adapters.outbound.context.api_context_provider import ApiContextProvider
from app.adapters.outbound.llm.openrouter_client import OpenRouterClient
from app.adapters.outbound.mcp.mcp_client import McpClient
from app.adapters.outbound.pii.redactor import redact
from app.application.agent.confirmation import parse_confirmation
from app.application.agent.read_agent import ReadAgent
from app.config import AppConfig
from app.domain.conversation.message import Message, Role, now_iso
from app.domain.conversation.policy import Outcome, PolicyDecision, PolicyEngine
from app.domain.conversation.ports import AuditLog, InjectionGuard
from app.domain.conversation.servicing import ServicingType, missing_slots
from app.domain.conversation.turn import (
    ConversationPhase,
    ConversationState,
    ReplyKind,
    TurnResult,
)

logger = logging.getLogger(__name__)

_LANES = "accounts, transactions, servicing, smalltalk"
_ACTIONS = ", ".join(a.value for a in ServicingType)

_ROUTE_SYSTEM = (
    "You are the router for a bank card-servicing assistant. Classify the customer "
    "message. Return STRICT JSON: {lane, action, confidence}.\n"
    f"- lane: one of [{_LANES}]. Use 'accounts' for balance/card/limit/credit-score "
    "questions, 'transactions' for spending/statement/'why was I charged' questions, "
    "'servicing' when the customer wants to DO something (reverse a fee, change a limit, "
    "replace/freeze a card, dispute, report fraud), 'smalltalk' otherwise.\n"
    f"- action: when lane='servicing', one of [{_ACTIONS}]; else null.\n"
    "- confidence: 0..1. You never decide or authorise anything."
)

# Maps an approved action to its servicing MCP write tool + argument builder.
_WRITE_TOOLS: dict[ServicingType, tuple[str, list[str]]] = {
    ServicingType.FEE_REVERSAL: ("reverse_fee", ["card_id", "fee_amount_minor"]),
    ServicingType.CREDIT_LIMIT_INCREASE: ("modify_credit_limit", ["card_id", "requested_limit_minor"]),
    ServicingType.CARD_REPLACEMENT: ("replace_card", ["card_id", "reason"]),
    ServicingType.FREEZE_CARD: ("freeze_card", ["card_id"]),
    ServicingType.UNFREEZE_CARD: ("unfreeze_card", ["card_id"]),
    ServicingType.DISPUTE: ("raise_dispute", ["card_id"]),
    ServicingType.REPORT_FRAUD: ("report_fraud", ["card_id"]),
}
# Rename slot -> tool argument where they differ.
_ARG_RENAME = {"fee_amount_minor": "fee_amount_minor", "requested_limit_minor": "new_limit_minor"}


class Coordinator:
    def __init__(
        self,
        *,
        guard: InjectionGuard,
        llm: OpenRouterClient,
        policy: PolicyEngine,
        audit: AuditLog,
        config: AppConfig,
    ) -> None:
        self._guard = guard
        self._llm = llm
        self._policy = policy
        self._audit = audit
        self._config = config
        mcp = config.mcp_servers
        self._accounts = ReadAgent(llm, mcp["accounts"], "the customer's accounts, cards, limits, and credit score")
        self._transactions = ReadAgent(llm, mcp["transactions"], "the customer's transactions, statements, and spending")

    # ── entry ──────────────────────────────────────────────────
    def handle(self, state: ConversationState, text: str, auth: AuthContext) -> TurnResult:
        state.messages.append(Message(Role.CUSTOMER, text, now_iso()))
        result = self._route(state, text, auth)
        state.messages.append(Message(Role.AGENT, result.text, now_iso()))
        return result

    def _route(self, state: ConversationState, text: str, auth: AuthContext) -> TurnResult:
        if self._guard.is_flagged(text):
            self._reset(state)
            return TurnResult(ReplyKind.REFUSE, "I can't help with that request.")
        if state.phase is ConversationPhase.AWAITING_CONFIRMATION:
            return self._handle_confirmation(state, text, auth)
        if state.phase is ConversationPhase.COLLECTING and state.pending_action is not None:
            return self._advance_servicing(state, text, auth)

        route = self._llm.complete_json(_ROUTE_SYSTEM, redact(text))
        lane = str(route.get("lane") or "smalltalk")
        state.shared["last_lane"] = lane

        if lane == "accounts":
            answer, _ = self._accounts.answer(auth.token, state.messages, text)
            return TurnResult(ReplyKind.ANSWER, answer or "I couldn't find that just now.")
        if lane == "transactions":
            answer, _ = self._transactions.answer(auth.token, state.messages, text)
            return TurnResult(ReplyKind.ANSWER, answer or "I couldn't find that just now.")
        if lane == "servicing":
            action = self._to_action(route.get("action"))
            if action is None or float(route.get("confidence") or 0) < self._config.confidence_threshold:
                return self._escalate_uncertain(state)
            state.pending_action = action
            state.slots = {}
            return self._advance_servicing(state, text, auth)

        # smalltalk / uncertain
        if float(route.get("confidence") or 0) < self._config.confidence_threshold:
            return self._escalate_uncertain(state)
        answer = self._llm.complete(
            "You are a concise, friendly bank card-servicing assistant. You can help with "
            "balances, transactions, fee reversals, limit changes, and card replacement. "
            "Do not invent account facts.",
            redact(text),
        )
        return TurnResult(ReplyKind.ANSWER, answer)

    # ── servicing lane ─────────────────────────────────────────
    def _advance_servicing(self, state: ConversationState, text: str, auth: AuthContext) -> TurnResult:
        assert state.pending_action is not None
        action = state.pending_action

        # Resolve concrete, real slot values from the customer's data via read tools.
        resolved = self._resolve_slots(action, state, text, auth)
        state.slots.update({k: v for k, v in resolved.items() if v not in (None, "")})

        missing = missing_slots(action, state.slots)
        if missing:
            state.phase = ConversationPhase.COLLECTING
            field = missing[0].replace("_", " ")
            return TurnResult(ReplyKind.ASK, f"Could you tell me the {field}?", action=action)

        ctx = ApiContextProvider(self._config.api_base_url, auth.token).policy_context(state.customer_id)
        decision = self._policy.decide(action, state.slots, ctx)

        if decision.outcome is Outcome.ESCALATE:
            seq = self._write_audit(state, decision, confirmed=False, tool_result=None)
            self._reset(state)
            return TurnResult(ReplyKind.ESCALATE, f"This needs a human specialist: {decision.reason}", action=action, decision=decision, escalated=True, audit_seq=seq)
        if decision.outcome is Outcome.DENY:
            seq = self._write_audit(state, decision, confirmed=False, tool_result=None)
            self._reset(state)
            return TurnResult(ReplyKind.EXPLAIN, f"I'm sorry, I can't do that: {decision.reason}", action=action, decision=decision, audit_seq=seq)

        state.phase = ConversationPhase.AWAITING_CONFIRMATION
        return TurnResult(ReplyKind.CONFIRM, self._confirm_prompt(action, state.slots), action=action, decision=decision)

    def _handle_confirmation(self, state: ConversationState, text: str, auth: AuthContext) -> TurnResult:
        assert state.pending_action is not None
        answer = parse_confirmation(text)
        action = state.pending_action
        if answer is None:
            return TurnResult(ReplyKind.CONFIRM, "Please confirm with yes or no.", action=action)
        if answer is False:
            self._reset(state)
            return TurnResult(ReplyKind.EXPLAIN, "No problem — I've cancelled that request.", action=action)

        ctx = ApiContextProvider(self._config.api_base_url, auth.token).policy_context(state.customer_id)
        decision = self._policy.decide(action, state.slots, ctx)
        if decision.outcome is not Outcome.ALLOW:
            seq = self._write_audit(state, decision, confirmed=True, tool_result=None)
            self._reset(state)
            escalated = decision.outcome is Outcome.ESCALATE
            kind = ReplyKind.ESCALATE if escalated else ReplyKind.EXPLAIN
            return TurnResult(kind, f"On review I can't complete that: {decision.reason}", action=action, decision=decision, escalated=escalated, audit_seq=seq)

        tool_result = self._execute_write(action, state.slots, auth.token)
        seq = self._write_audit(state, decision, confirmed=True, tool_result=tool_result)
        self._reset(state)
        return TurnResult(ReplyKind.EXPLAIN, self._outcome_text(action, tool_result), action=action, decision=decision, executed=True, audit_seq=seq)

    # ── slot resolution (grounded in real data) ────────────────
    def _resolve_slots(self, action: ServicingType, state: ConversationState, text: str, auth: AuthContext) -> dict[str, object]:
        from app.domain.conversation.servicing import REQUIRED_SLOTS

        required = ", ".join(REQUIRED_SLOTS[action])
        accounts = McpClient(self._config.mcp_servers["accounts"], auth.token)
        transactions = McpClient(self._config.mcp_servers["transactions"], auth.token)
        tools = accounts.openai_tools() + transactions.openai_tools()

        def dispatch(name: str, args: dict[str, Any]) -> str:
            names_a = {t["function"]["name"] for t in accounts.openai_tools()}
            return accounts.call(name, args) if name in names_a else transactions.call(name, args)

        system = (
            "Resolve a bank servicing request into concrete slot values using your tools. "
            f"Action: '{action.value}'. Required slots: {required}. "
            "Use tools to find the real card_id (resolve phrases like 'my credit card') and any "
            "amounts (integer paise, ₹1=100) from the customer's ACTUAL data — never invent them. "
            "When done, reply with ONLY a strict JSON object of the resolved slots (no prose)."
        )
        history = [
            *({"role": "user" if m.role.value == "customer" else "assistant", "content": m.text} for m in state.messages[-6:]),
            {"role": "user", "content": redact(text)},
        ]
        final, _ = self._llm.run_agent_loop(system=system, messages=history, tools=tools, dispatch=dispatch)
        try:
            data = json.loads(final)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _execute_write(self, action: ServicingType, slots: dict[str, object], token: str) -> dict[str, object] | None:
        mapping = _WRITE_TOOLS.get(action)
        if mapping is None:
            return None
        tool_name, slot_keys = mapping
        args: dict[str, Any] = {}
        for key in slot_keys:
            if key not in slots:
                continue
            arg_name = _ARG_RENAME.get(key, key)
            value = slots[key]
            if key.endswith("_minor"):
                value = int(value)  # type: ignore[arg-type]
            args[arg_name] = value
        client = McpClient(self._config.mcp_servers["servicing"], token)
        raw = client.call(tool_name, args)
        try:
            return {"tool": tool_name, "result": json.loads(raw)}
        except json.JSONDecodeError:
            return {"tool": tool_name, "result": raw}

    # ── helpers ────────────────────────────────────────────────
    def _escalate_uncertain(self, state: ConversationState) -> TurnResult:
        self._reset(state)
        return TurnResult(ReplyKind.ESCALATE, "I'm not fully sure I understand — connecting you to a support specialist.", escalated=True)

    def _write_audit(self, state: ConversationState, decision: PolicyDecision, *, confirmed: bool, tool_result: dict[str, object] | None) -> int:
        assert state.pending_action is not None
        record = self._audit.append(
            conversation_id=state.conversation_id,
            customer_id=state.customer_id,
            action=state.pending_action.value,
            decision=decision.outcome.value,
            rule=decision.rule,
            slots=dict(state.slots),
            confirmed=confirmed,
            tool_result=tool_result,
        )
        return record.seq

    @staticmethod
    def _to_action(value: object) -> ServicingType | None:
        if not value:
            return None
        try:
            return ServicingType(value)
        except ValueError:
            return None

    @staticmethod
    def _confirm_prompt(action: ServicingType, slots: dict[str, object]) -> str:
        label = action.value.replace("_", " ")
        return f"I can proceed with your {label} request. Shall I confirm? (yes/no)"

    @staticmethod
    def _outcome_text(action: ServicingType, tool_result: dict[str, object] | None) -> str:
        label = action.value.replace("_", " ")
        if not tool_result:
            return f"This needs a specialist to complete your {label} request."
        return f"Done — your {label} request has been completed."

    @staticmethod
    def _reset(state: ConversationState) -> None:
        state.phase = ConversationPhase.IDLE
        state.pending_action = None
        state.slots = {}
