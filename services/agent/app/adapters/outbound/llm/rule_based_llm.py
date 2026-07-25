"""Deterministic, rule-based stand-in for the LLM (behind the LanguageModel port).

Lets the whole pipeline run locally with no API key. A real GPT-4 adapter would
implement the same port; swapping it changes nothing above this file. Tests use
their own stubs for precise control — this one powers the running demo.
"""

from __future__ import annotations

import re

from app.domain.conversation.intent import ClassifiedIntent, IntentKind
from app.domain.conversation.message import Message
from app.domain.conversation.servicing import ServicingType

_ACTION_KEYWORDS: tuple[tuple[ServicingType, tuple[str, ...]], ...] = (
    (ServicingType.REPORT_FRAUD, ("fraud", "fraudulent", "unauthorized")),
    (ServicingType.DISPUTE, ("dispute", "chargeback", "don't recognise", "dont recognize")),
    (ServicingType.FEE_REVERSAL, ("fee reversal", "reverse", "late fee", "waive")),
    (ServicingType.CREDIT_LIMIT_INCREASE, ("credit limit", "limit increase", "increase my limit")),
    (ServicingType.CARD_REPLACEMENT, ("replace", "lost card", "stolen card", "new card")),
    (ServicingType.UNFREEZE_CARD, ("unfreeze", "unblock", "unlock")),
    (ServicingType.FREEZE_CARD, ("freeze", "block my card", "lock my card")),
    (ServicingType.AUTOPAY_SETUP, ("autopay", "auto pay", "automatic payment")),
    (ServicingType.PAYMENT_DATE_CHANGE, ("payment date", "due date", "billing date")),
    (ServicingType.CONTACT_UPDATE, ("update my email", "change my phone", "update address")),
)

_POLICY_HINTS = ("how", "what", "when", "am i eligible", "policy", "can i", "?")


def _first_amount_minor(text: str) -> int | None:
    match = re.search(r"([\d][\d,]*)(?:\.(\d{1,2}))?", text.replace("₹", " "))
    if not match:
        return None
    rupees = int(match.group(1).replace(",", ""))
    paise = int((match.group(2) or "0").ljust(2, "0")[:2])
    return rupees * 100 + paise


def _detect_card_id(text: str) -> str | None:
    lowered = text.lower()
    if "credit" in lowered or "6390" in lowered:
        return "card_credit_1"
    if "debit" in lowered or "5210" in lowered:
        return "card_debit_1"
    return None


class RuleBasedLanguageModel:
    def classify(self, text: str, history: list[Message]) -> ClassifiedIntent:
        lowered = text.lower()
        for action, keywords in _ACTION_KEYWORDS:
            if any(kw in lowered for kw in keywords):
                slots = self.extract_slots(action, text, {})
                return ClassifiedIntent(IntentKind.ACTION, 0.9, action, slots)
        if any(hint in lowered for hint in _POLICY_HINTS):
            return ClassifiedIntent(IntentKind.POLICY_QUERY, 0.75)
        return ClassifiedIntent(IntentKind.UNCERTAIN, 0.2)

    def extract_slots(
        self, action: ServicingType, text: str, known: dict[str, object]
    ) -> dict[str, object]:
        found: dict[str, object] = {}
        card_id = _detect_card_id(text)
        if card_id:
            found["card_id"] = card_id

        if action is ServicingType.FEE_REVERSAL:
            amount = _first_amount_minor(text)
            if amount is not None:
                found["fee_amount_minor"] = amount
        elif action is ServicingType.CREDIT_LIMIT_INCREASE:
            amount = _first_amount_minor(text)
            if amount is not None:
                found["requested_limit_minor"] = amount
        elif action is ServicingType.PAYMENT_DATE_CHANGE:
            day = re.search(r"\b([12]?\d|3[01])\b", text)
            if day:
                found["new_day_of_month"] = int(day.group(1))
        elif action is ServicingType.CARD_REPLACEMENT:
            for reason in ("lost", "stolen", "damaged"):
                if reason in text.lower():
                    found["reason"] = reason
                    break
        elif action is ServicingType.CONTACT_UPDATE:
            for field in ("email", "phone", "address"):
                if field in text.lower():
                    found["field"] = field
                    break
            email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
            if email:
                found["value"] = email.group(0)

        return found

    def answer_policy_query(self, text: str) -> str:
        return (
            "Here's the general policy. For most requests I can help right away; "
            "some (like disputes or fraud) go to a specialist. Ask me to start a "
            "specific request and I'll walk you through it."
        )
