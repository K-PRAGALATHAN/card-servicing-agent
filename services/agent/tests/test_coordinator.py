"""Coordinator servicing flow with fakes (no network).

Verifies the grounded servicing spine deterministically: route → resolve slots →
deterministic policy → confirm → execute (write tool) → audit. The LLM, MCP
servers, and API-context provider are all faked, so only our orchestration and
the real PolicyEngine are under test.
"""

from __future__ import annotations

import json

from app.adapters.outbound.audit.in_memory_audit_log import InMemoryAuditLog
from app.adapters.outbound.guard.heuristic_injection_guard import HeuristicInjectionGuard
from app.adapters.outbound.session.mongo_session_store import InMemorySessionStore
from app.application.agent import coordinator as coord_mod
from app.application.agent.coordinator import Coordinator
from app.config import AppConfig
from app.domain.conversation.audit import verify_chain
from app.domain.conversation.policy import CustomerPolicyContext, PolicyEngine
from app.domain.conversation.turn import ReplyKind


class FakeLLM:
    def __init__(self, route: dict, slots: dict) -> None:
        self._route = route
        self._slots = slots

    def complete_json(self, system: str, user: str) -> dict:
        return self._route

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        return "ok"

    def run_agent_loop(self, *, system, messages, tools, dispatch, max_iters=6, temperature=0):
        return json.dumps(self._slots), None


class FakeMcp:
    def __init__(self, url: str, token: str) -> None: ...
    def openai_tools(self) -> list:
        return []

    def call(self, name: str, arguments: dict) -> str:
        return json.dumps({"tool": name, "arguments": arguments, "ok": True})


class FakeCtx:
    def __init__(self, base: str, token: str) -> None: ...
    def policy_context(self, customer_id: str) -> CustomerPolicyContext:
        return CustomerPolicyContext(
            fee_reversals_used_this_year=0,
            current_credit_limit_minor=18_000_000,
            monthly_income_minor=0,
            kyc_verified=True,
            account_in_good_standing=True,
        )


class Auth:
    customer_id = "c1"
    token = "tok"


def _coordinator(route: dict, slots: dict, monkeypatch) -> tuple[Coordinator, object]:
    monkeypatch.setattr(coord_mod, "McpClient", FakeMcp)
    monkeypatch.setattr(coord_mod, "ApiContextProvider", FakeCtx)
    audit = InMemoryAuditLog()
    coordinator = Coordinator(
        guard=HeuristicInjectionGuard(),
        llm=FakeLLM(route, slots),
        policy=PolicyEngine(),
        audit=audit,
        config=AppConfig(),
    )
    return coordinator, audit


def test_fee_reversal_confirms_then_executes(monkeypatch) -> None:
    coordinator, audit = _coordinator(
        {"lane": "servicing", "action": "fee_reversal", "confidence": 0.9},
        {"card_id": "card_credit_1", "fee_amount_minor": 50_000},
        monkeypatch,
    )
    sessions = InMemorySessionStore()
    state = sessions.get_or_create("conv1", "c1")

    first = coordinator.handle(state, "reverse the late fee on my credit card", Auth())
    assert first.kind is ReplyKind.CONFIRM

    second = coordinator.handle(state, "yes", Auth())
    assert second.kind is ReplyKind.EXPLAIN
    assert second.executed is True

    records = audit.for_conversation("conv1")
    assert records and records[-1].decision == "allow"
    assert verify_chain(records)


def test_fee_reversal_above_cap_escalates(monkeypatch) -> None:
    coordinator, _ = _coordinator(
        {"lane": "servicing", "action": "fee_reversal", "confidence": 0.9},
        {"card_id": "card_credit_1", "fee_amount_minor": 500_000},  # over the ₹1,000 cap
        monkeypatch,
    )
    sessions = InMemorySessionStore()
    state = sessions.get_or_create("conv2", "c1")

    result = coordinator.handle(state, "reverse this huge fee", Auth())
    assert result.kind is ReplyKind.ESCALATE
