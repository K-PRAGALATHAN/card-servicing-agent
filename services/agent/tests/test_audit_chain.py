import dataclasses

from app.adapters.outbound.audit.in_memory_audit_log import InMemoryAuditLog
from app.domain.conversation.audit import GENESIS_HASH, verify_chain


def _seed(log: InMemoryAuditLog) -> None:
    log.append(
        conversation_id="c1",
        customer_id="cust",
        action="fee_reversal",
        decision="allow",
        rule="fee_reversal.courtesy",
        slots={"fee_amount_minor": 50_000},
        confirmed=True,
        tool_result={"status": "executed"},
    )
    log.append(
        conversation_id="c1",
        customer_id="cust",
        action="dispute",
        decision="escalate",
        rule="dispute.specialist",
        slots={},
        confirmed=False,
        tool_result=None,
    )


def test_chain_links_and_verifies():
    log = InMemoryAuditLog()
    _seed(log)
    records = log.all()

    assert records[0].prev_hash == GENESIS_HASH
    assert records[1].prev_hash == records[0].hash
    assert verify_chain(records) is True


def test_tampering_breaks_verification():
    log = InMemoryAuditLog()
    _seed(log)
    records = log.all()

    # Alter a field without recomputing the hash -> chain must fail.
    tampered = list(records)
    tampered[0] = dataclasses.replace(tampered[0], decision="deny")
    assert verify_chain(tampered) is False
