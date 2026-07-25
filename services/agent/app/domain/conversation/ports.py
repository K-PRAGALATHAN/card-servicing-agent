"""Ports (Protocols) the agent pipeline depends on. Adapters implement these."""

from __future__ import annotations

from typing import Protocol

from app.domain.conversation.audit import AuditRecord
from app.domain.conversation.intent import ClassifiedIntent
from app.domain.conversation.message import Message
from app.domain.conversation.policy import CustomerPolicyContext
from app.domain.conversation.servicing import ServicingType


class InjectionGuard(Protocol):
    def is_flagged(self, text: str) -> bool: ...


class LanguageModel(Protocol):
    def classify(self, text: str, history: list[Message]) -> ClassifiedIntent: ...

    def extract_slots(
        self, action: ServicingType, text: str, known: dict[str, object]
    ) -> dict[str, object]: ...

    def answer_policy_query(self, text: str) -> str: ...


class ToolExecutor(Protocol):
    def execute(
        self, action: ServicingType, customer_id: str, slots: dict[str, object]
    ) -> dict[str, object]: ...


class CustomerContextProvider(Protocol):
    def policy_context(self, customer_id: str) -> CustomerPolicyContext: ...


class AuditLog(Protocol):
    def append(
        self,
        *,
        conversation_id: str,
        customer_id: str,
        action: str,
        decision: str,
        rule: str,
        slots: dict[str, object],
        confirmed: bool,
        tool_result: dict[str, object] | None,
    ) -> AuditRecord: ...

    def for_conversation(self, conversation_id: str) -> list[AuditRecord]: ...
