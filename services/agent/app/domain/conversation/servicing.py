"""Servicing action types, their required slots, and priority.

Mirrors the API's servicing types (services/api). Kept as an independent
domain model so the agent has no build-time coupling to the API.
"""

from __future__ import annotations

from enum import Enum


class ServicingType(str, Enum):
    FEE_REVERSAL = "fee_reversal"
    CREDIT_LIMIT_INCREASE = "credit_limit_increase"
    CARD_REPLACEMENT = "card_replacement"
    FREEZE_CARD = "freeze_card"
    UNFREEZE_CARD = "unfreeze_card"
    AUTOPAY_SETUP = "autopay_setup"
    PAYMENT_DATE_CHANGE = "payment_date_change"
    CONTACT_UPDATE = "contact_update"
    DISPUTE = "dispute"
    REPORT_FRAUD = "report_fraud"


# Required slots the agent must collect before the policy engine can decide.
REQUIRED_SLOTS: dict[ServicingType, tuple[str, ...]] = {
    ServicingType.FEE_REVERSAL: ("card_id", "fee_amount_minor"),
    ServicingType.CREDIT_LIMIT_INCREASE: ("card_id", "requested_limit_minor"),
    ServicingType.CARD_REPLACEMENT: ("card_id", "reason"),
    ServicingType.FREEZE_CARD: ("card_id",),
    ServicingType.UNFREEZE_CARD: ("card_id",),
    ServicingType.AUTOPAY_SETUP: ("card_id", "source_account_id"),
    ServicingType.PAYMENT_DATE_CHANGE: ("card_id", "new_day_of_month"),
    ServicingType.CONTACT_UPDATE: ("field", "value"),
    ServicingType.DISPUTE: ("card_id", "transaction_ref"),
    ServicingType.REPORT_FRAUD: ("card_id",),
}

_HIGH_PRIORITY: frozenset[ServicingType] = frozenset(
    {
        ServicingType.FEE_REVERSAL,
        ServicingType.CREDIT_LIMIT_INCREASE,
        ServicingType.CARD_REPLACEMENT,
        ServicingType.DISPUTE,
        ServicingType.REPORT_FRAUD,
    }
)


def priority_for(action: ServicingType) -> str:
    return "high" if action in _HIGH_PRIORITY else "medium"


def missing_slots(action: ServicingType, slots: dict[str, object]) -> list[str]:
    return [
        name
        for name in REQUIRED_SLOTS[action]
        if slots.get(name) in (None, "")
    ]
