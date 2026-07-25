"""Hash-chained audit trail.

Each record embeds the hash of the previous one, so the whole chain is
tamper-evident: recompute it and any change breaks the links. (Phase 5 hardens
this into a durable, alerting store; the chaining contract is defined here.)
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass

GENESIS_HASH = "0" * 64


@dataclass(frozen=True)
class AuditRecord:
    seq: int
    at: str
    conversation_id: str
    customer_id: str
    action: str
    decision: str
    rule: str
    slots: dict[str, object]
    confirmed: bool
    tool_result: dict[str, object] | None
    prev_hash: str
    hash: str


def compute_record_hash(
    prev_hash: str,
    *,
    seq: int,
    at: str,
    conversation_id: str,
    customer_id: str,
    action: str,
    decision: str,
    rule: str,
    slots: dict[str, object],
    confirmed: bool,
    tool_result: dict[str, object] | None,
) -> str:
    payload = {
        "seq": seq,
        "at": at,
        "conversation_id": conversation_id,
        "customer_id": customer_id,
        "action": action,
        "decision": decision,
        "rule": rule,
        "slots": slots,
        "confirmed": confirmed,
        "tool_result": tool_result,
        "prev_hash": prev_hash,
    }
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def verify_chain(records: Iterable[AuditRecord]) -> bool:
    """True iff every record's prev_hash/hash link is intact and in order."""
    prev = GENESIS_HASH
    expected_seq = 1
    for record in records:
        if record.seq != expected_seq or record.prev_hash != prev:
            return False
        recomputed = compute_record_hash(
            prev,
            seq=record.seq,
            at=record.at,
            conversation_id=record.conversation_id,
            customer_id=record.customer_id,
            action=record.action,
            decision=record.decision,
            rule=record.rule,
            slots=record.slots,
            confirmed=record.confirmed,
            tool_result=record.tool_result,
        )
        if recomputed != record.hash:
            return False
        prev = record.hash
        expected_seq += 1
    return True
