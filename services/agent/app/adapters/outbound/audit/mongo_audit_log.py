"""Durable, hash-chained audit log backed by MongoDB.

Same contract as the in-memory log, but records persist and form one global,
tamper-evident chain (each record embeds the previous record's hash). The
auditor console reads and re-verifies this chain across all conversations.
"""

from __future__ import annotations

from app.domain.conversation.audit import (
    GENESIS_HASH,
    AuditRecord,
    compute_record_hash,
    verify_chain,
)
from app.domain.conversation.message import now_iso


def _to_doc(r: AuditRecord) -> dict[str, object]:
    return {
        "seq": r.seq,
        "at": r.at,
        "conversation_id": r.conversation_id,
        "customer_id": r.customer_id,
        "action": r.action,
        "decision": r.decision,
        "rule": r.rule,
        "slots": r.slots,
        "confirmed": r.confirmed,
        "tool_result": r.tool_result,
        "prev_hash": r.prev_hash,
        "hash": r.hash,
    }


def _from_doc(d: dict) -> AuditRecord:
    return AuditRecord(
        seq=d["seq"],
        at=d["at"],
        conversation_id=d["conversation_id"],
        customer_id=d["customer_id"],
        action=d["action"],
        decision=d["decision"],
        rule=d["rule"],
        slots=dict(d.get("slots") or {}),
        confirmed=d["confirmed"],
        tool_result=d.get("tool_result"),
        prev_hash=d["prev_hash"],
        hash=d["hash"],
    )


class MongoAuditLog:
    def __init__(self, mongo_url: str, db_name: str) -> None:
        from pymongo import ASCENDING, MongoClient

        self._col = MongoClient(mongo_url)[db_name]["audit"]
        self._col.create_index([("seq", ASCENDING)], unique=True)
        self._col.create_index([("conversation_id", ASCENDING)])

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
        last = self._col.find_one(sort=[("seq", -1)])
        seq = (last["seq"] + 1) if last else 1
        prev_hash = last["hash"] if last else GENESIS_HASH
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
        self._col.insert_one(_to_doc(record))
        return record

    def all(self) -> list[AuditRecord]:
        return [_from_doc(d) for d in self._col.find(sort=[("seq", 1)])]

    def for_conversation(self, conversation_id: str) -> list[AuditRecord]:
        return [_from_doc(d) for d in self._col.find({"conversation_id": conversation_id}, sort=[("seq", 1)])]

    def verify(self) -> bool:
        """Re-verify the whole global chain — any tamper breaks a link."""
        return verify_chain(self.all())
