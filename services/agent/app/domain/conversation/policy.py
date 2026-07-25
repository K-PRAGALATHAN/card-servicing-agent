"""Deterministic policy engine.

The LLM never decides an outcome. This module is plain, versioned, testable
code that maps (action, slots, customer context) -> a decision. Every branch is
covered by tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.domain.conversation.servicing import ServicingType


class Outcome(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    ESCALATE = "escalate"  # out of policy / needs a human


@dataclass(frozen=True)
class PolicyDecision:
    outcome: Outcome
    rule: str
    reason: str
    version: int


@dataclass(frozen=True)
class CustomerPolicyContext:
    fee_reversals_used_this_year: int = 0
    current_credit_limit_minor: int = 0
    monthly_income_minor: int = 0
    kyc_verified: bool = True
    account_in_good_standing: bool = True


# Tunable thresholds (would come from config/rules service in production).
FEE_REVERSAL_CAP_MINOR = 100_000  # ₹1,000 courtesy cap
FEE_REVERSALS_PER_YEAR = 2
LIMIT_INCREASE_MAX_MULTIPLE = 2.0  # up to 2x current limit auto-approved
LIMIT_INCOME_MULTIPLE = 3  # requested limit must be <= 3x monthly income


class PolicyEngine:
    VERSION = 1

    def decide(
        self,
        action: ServicingType,
        slots: dict[str, object],
        ctx: CustomerPolicyContext,
    ) -> PolicyDecision:
        handler = getattr(self, f"_{action.value}", None)
        if handler is None:
            return self._escalate(f"{action.value}.no_rule", "No policy rule; routing to a human.")
        return handler(slots, ctx)

    # ── helpers ────────────────────────────────────────────────
    def _allow(self, rule: str, reason: str) -> PolicyDecision:
        return PolicyDecision(Outcome.ALLOW, rule, reason, self.VERSION)

    def _deny(self, rule: str, reason: str) -> PolicyDecision:
        return PolicyDecision(Outcome.DENY, rule, reason, self.VERSION)

    def _escalate(self, rule: str, reason: str) -> PolicyDecision:
        return PolicyDecision(Outcome.ESCALATE, rule, reason, self.VERSION)

    @staticmethod
    def _as_int(value: object) -> int:
        return int(value) if value is not None else 0

    # ── rules ──────────────────────────────────────────────────
    def _fee_reversal(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        if not ctx.kyc_verified or not ctx.account_in_good_standing:
            return self._escalate("fee_reversal.account_review", "Account needs manual review.")
        fee = self._as_int(slots.get("fee_amount_minor"))
        if fee > FEE_REVERSAL_CAP_MINOR:
            return self._escalate("fee_reversal.above_cap", "Fee exceeds the courtesy cap.")
        if ctx.fee_reversals_used_this_year >= FEE_REVERSALS_PER_YEAR:
            return self._deny("fee_reversal.annual_limit", "Annual courtesy reversal limit reached.")
        return self._allow("fee_reversal.courtesy", "Within the courtesy reversal policy.")

    def _credit_limit_increase(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        requested = self._as_int(slots.get("requested_limit_minor"))
        current = ctx.current_credit_limit_minor
        if requested <= current:
            return self._deny("credit_limit.not_higher", "Requested limit is not higher than current.")
        if requested > current * LIMIT_INCREASE_MAX_MULTIPLE:
            return self._escalate("credit_limit.large_increase", "Increase too large for auto-approval.")
        if ctx.monthly_income_minor > 0 and requested > ctx.monthly_income_minor * LIMIT_INCOME_MULTIPLE:
            return self._escalate("credit_limit.income_cap", "Exceeds income-based cap; needs underwriting.")
        return self._allow("credit_limit.auto_band", "Within the auto-approval band.")

    def _card_replacement(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._allow("card_replacement.standard", "Standard card replacement.")

    def _freeze_card(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._allow("freeze_card.self_service", "Cardholder may freeze their own card.")

    def _unfreeze_card(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._allow("unfreeze_card.self_service", "Cardholder may unfreeze their own card.")

    def _autopay_setup(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._allow("autopay.self_service", "Autopay setup is self-service.")

    def _payment_date_change(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        day = self._as_int(slots.get("new_day_of_month"))
        if not 1 <= day <= 28:
            return self._deny("payment_date.range", "Payment day must be between 1 and 28.")
        return self._allow("payment_date.self_service", "Within the allowed payment-date range.")

    def _contact_update(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        field = str(slots.get("field") or "")
        if field not in {"email", "phone", "address"}:
            return self._deny("contact_update.unknown_field", "Only email, phone, or address can be updated.")
        return self._allow("contact_update.self_service", "Contact detail update is self-service.")

    def _dispute(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._escalate("dispute.specialist", "Disputes are handled by a specialist.")

    def _report_fraud(self, slots, ctx: CustomerPolicyContext) -> PolicyDecision:
        return self._escalate("report_fraud.security_team", "Fraud reports go to the security team.")
