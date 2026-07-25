"""The agent pipeline.

Implements the product's decision flow as explicit, testable steps:

    injection guard -> classify intent -> fill slots -> policy engine
        -> request confirmation -> execute tool -> write audit -> explain

The LLM (a port) only converses: it classifies and extracts slots. The
PolicyEngine decides. Nothing executes without an ALLOW decision *and* explicit
customer confirmation, and every executed/denied/escalated decision is audited.
"""

from __future__ import annotations

from app.application.agent.confirmation import parse_confirmation
from app.domain.conversation.intent import IntentKind
from app.domain.conversation.message import Message, Role, now_iso
from app.domain.conversation.policy import Outcome, PolicyDecision, PolicyEngine
from app.domain.conversation.ports import (
    AuditLog,
    CustomerContextProvider,
    InjectionGuard,
    LanguageModel,
    ToolExecutor,
)
from app.domain.conversation.servicing import ServicingType, missing_slots
from app.domain.conversation.turn import (
    ConversationPhase,
    ConversationState,
    ReplyKind,
    TurnResult,
)


class AgentPipeline:
    def __init__(
        self,
        *,
        guard: InjectionGuard,
        llm: LanguageModel,
        policy: PolicyEngine,
        tools: ToolExecutor,
        audit: AuditLog,
        context: CustomerContextProvider,
        confidence_threshold: float = 0.6,
    ) -> None:
        self._guard = guard
        self._llm = llm
        self._policy = policy
        self._tools = tools
        self._audit = audit
        self._context = context
        self._threshold = confidence_threshold

    def handle(self, state: ConversationState, text: str) -> TurnResult:
        state.messages.append(Message(Role.CUSTOMER, text, now_iso()))
        result = self._route(state, text)
        state.messages.append(Message(Role.AGENT, result.text, now_iso()))
        return result

    # ── routing ────────────────────────────────────────────────
    def _route(self, state: ConversationState, text: str) -> TurnResult:
        if self._guard.is_flagged(text):
            self._reset(state)
            return TurnResult(ReplyKind.REFUSE, "I can't help with that request.")
        if state.phase is ConversationPhase.AWAITING_CONFIRMATION:
            return self._handle_confirmation(state, text)
        if state.phase is ConversationPhase.COLLECTING:
            return self._collect(state, text)
        return self._classify(state, text)

    def _classify(self, state: ConversationState, text: str) -> TurnResult:
        intent = self._llm.classify(text, state.messages)
        if intent.kind is IntentKind.UNCERTAIN or intent.confidence < self._threshold:
            return self._escalate_uncertain(state)
        if intent.kind is IntentKind.POLICY_QUERY:
            return TurnResult(ReplyKind.ANSWER, self._llm.answer_policy_query(text))
        # ACTION
        assert intent.action is not None
        state.pending_action = intent.action
        state.slots = dict(intent.slots)
        return self._advance_action(state)

    def _collect(self, state: ConversationState, text: str) -> TurnResult:
        assert state.pending_action is not None
        state.slots.update(self._llm.extract_slots(state.pending_action, text, state.slots))
        return self._advance_action(state)

    def _advance_action(self, state: ConversationState) -> TurnResult:
        assert state.pending_action is not None
        missing = missing_slots(state.pending_action, state.slots)
        if missing:
            state.phase = ConversationPhase.COLLECTING
            field = missing[0].replace("_", " ")
            return TurnResult(
                ReplyKind.ASK, f"Could you provide your {field}?", action=state.pending_action
            )
        return self._decide(state)

    # ── decision + execution ───────────────────────────────────
    def _decide(self, state: ConversationState) -> TurnResult:
        assert state.pending_action is not None
        action = state.pending_action
        decision = self._policy.decide(
            action, state.slots, self._context.policy_context(state.customer_id)
        )
        if decision.outcome is Outcome.ESCALATE:
            seq = self._write_audit(state, decision, confirmed=False, tool_result=None)
            self._reset(state)
            return TurnResult(
                ReplyKind.ESCALATE,
                f"This needs a human specialist: {decision.reason}",
                action=action,
                decision=decision,
                escalated=True,
                audit_seq=seq,
            )
        if decision.outcome is Outcome.DENY:
            seq = self._write_audit(state, decision, confirmed=False, tool_result=None)
            self._reset(state)
            return TurnResult(
                ReplyKind.EXPLAIN,
                f"I'm sorry, I can't do that: {decision.reason}",
                action=action,
                decision=decision,
                audit_seq=seq,
            )
        # ALLOW -> require confirmation before executing
        state.phase = ConversationPhase.AWAITING_CONFIRMATION
        return TurnResult(
            ReplyKind.CONFIRM,
            self._confirmation_prompt(action, state.slots),
            action=action,
            decision=decision,
        )

    def _handle_confirmation(self, state: ConversationState, text: str) -> TurnResult:
        assert state.pending_action is not None
        answer = parse_confirmation(text)
        if answer is None:
            return TurnResult(
                ReplyKind.CONFIRM, "Please confirm with yes or no.", action=state.pending_action
            )
        action = state.pending_action
        if answer is False:
            self._reset(state)
            return TurnResult(
                ReplyKind.EXPLAIN, "No problem — I've cancelled that request.", action=action
            )
        # Re-check policy at execution time (defence in depth).
        decision = self._policy.decide(
            action, state.slots, self._context.policy_context(state.customer_id)
        )
        if decision.outcome is not Outcome.ALLOW:
            seq = self._write_audit(state, decision, confirmed=True, tool_result=None)
            self._reset(state)
            escalated = decision.outcome is Outcome.ESCALATE
            kind = ReplyKind.ESCALATE if escalated else ReplyKind.EXPLAIN
            return TurnResult(
                kind,
                f"On review I can't complete that: {decision.reason}",
                action=action,
                decision=decision,
                escalated=escalated,
                audit_seq=seq,
            )
        tool_result = self._tools.execute(action, state.customer_id, state.slots)
        seq = self._write_audit(state, decision, confirmed=True, tool_result=tool_result)
        self._reset(state)
        return TurnResult(
            ReplyKind.EXPLAIN,
            self._outcome_text(action, tool_result),
            action=action,
            decision=decision,
            executed=True,
            audit_seq=seq,
        )

    def _escalate_uncertain(self, state: ConversationState) -> TurnResult:
        self._reset(state)
        return TurnResult(
            ReplyKind.ESCALATE,
            "I'm not fully sure I understand — connecting you to a support specialist.",
            escalated=True,
        )

    # ── helpers ────────────────────────────────────────────────
    def _write_audit(
        self,
        state: ConversationState,
        decision: PolicyDecision,
        *,
        confirmed: bool,
        tool_result: dict[str, object] | None,
    ) -> int:
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
    def _confirmation_prompt(action: ServicingType, slots: dict[str, object]) -> str:
        label = action.value.replace("_", " ")
        return f"I can proceed with your {label} request. Shall I confirm? (yes/no)"

    @staticmethod
    def _outcome_text(action: ServicingType, tool_result: dict[str, object]) -> str:
        label = action.value.replace("_", " ")
        ref = tool_result.get("reference")
        suffix = f" Reference: {ref}." if ref else ""
        return f"Done — your {label} request has been completed.{suffix}"

    @staticmethod
    def _reset(state: ConversationState) -> None:
        state.phase = ConversationPhase.IDLE
        state.pending_action = None
        state.slots = {}
