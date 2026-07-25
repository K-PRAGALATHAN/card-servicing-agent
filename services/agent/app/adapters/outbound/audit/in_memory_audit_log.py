"""In-memory hash-chained audit log (implements the AuditLog port)."""

from __future__ import annotations

from app.domain.conversation.audit import (
    GENESIS_HASH,
    AuditRecord,
    compute_record_hash,
)
from app.domain.conversation.message import now_iso


class InMemoryAuditLog:
    def __init__(self) -> None:
        self._records: list[AuditRecord] = []

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
    ) -> AuditRecord:
        seq = len(self._records) + 1
        prev_hash = self._records[-1].hash if self._records else GENESIS_HASH
        at = now_iso()
        record_hash = compute_record_hash(
            prev_hash,
            seq=seq,
            at=at,
            conversation_id=conversation_id,
            customer_id=customer_id,
            action=action,
            decision=decision,
            rule=rule,
            slots=slots,
            confirmed=confirmed,
            tool_result=tool_result,
        )
        record = AuditRecord(
            seq=seq,
            at=at,
            conversation_id=conversation_id,
            customer_id=customer_id,
            action=action,
            decision=decision,
            rule=rule,
            slots=slots,
            confirmed=confirmed,
            tool_result=tool_result,
            prev_hash=prev_hash,
            hash=record_hash,
        )
        self._records.append(record)
        return record

    def all(self) -> list[AuditRecord]:
        return list(self._records)

    def for_conversation(self, conversation_id: str) -> list[AuditRecord]:
        return [r for r in self._records if r.conversation_id == conversation_id]
