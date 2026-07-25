from app.domain.conversation.policy import (
    CustomerPolicyContext,
    Outcome,
    PolicyEngine,
)
from app.domain.conversation.servicing import ServicingType

engine = PolicyEngine()


def good_ctx(**kw) -> CustomerPolicyContext:
    base = {
        "fee_reversals_used_this_year": 0,
        "current_credit_limit_minor": 18_000_000,
        "monthly_income_minor": 15_000_000,
        "kyc_verified": True,
        "account_in_good_standing": True,
    }
    base.update(kw)
    return CustomerPolicyContext(**base)


def test_fee_reversal_allowed_within_policy():
    d = engine.decide(ServicingType.FEE_REVERSAL, {"fee_amount_minor": 50_000}, good_ctx())
    assert d.outcome is Outcome.ALLOW
    assert d.rule == "fee_reversal.courtesy"


def test_fee_reversal_denied_over_annual_limit():
    d = engine.decide(
        ServicingType.FEE_REVERSAL,
        {"fee_amount_minor": 50_000},
        good_ctx(fee_reversals_used_this_year=2),
    )
    assert d.outcome is Outcome.DENY


def test_fee_reversal_escalates_above_cap():
    d = engine.decide(ServicingType.FEE_REVERSAL, {"fee_amount_minor": 200_000}, good_ctx())
    assert d.outcome is Outcome.ESCALATE


def test_fee_reversal_escalates_when_kyc_unverified():
    d = engine.decide(
        ServicingType.FEE_REVERSAL, {"fee_amount_minor": 10_000}, good_ctx(kyc_verified=False)
    )
    assert d.outcome is Outcome.ESCALATE


def test_credit_limit_denied_when_not_higher():
    d = engine.decide(
        ServicingType.CREDIT_LIMIT_INCREASE, {"requested_limit_minor": 18_000_000}, good_ctx()
    )
    assert d.outcome is Outcome.DENY


def test_credit_limit_allowed_within_band():
    d = engine.decide(
        ServicingType.CREDIT_LIMIT_INCREASE, {"requested_limit_minor": 25_000_000}, good_ctx()
    )
    assert d.outcome is Outcome.ALLOW


def test_credit_limit_escalates_on_large_increase():
    d = engine.decide(
        ServicingType.CREDIT_LIMIT_INCREASE, {"requested_limit_minor": 50_000_000}, good_ctx()
    )
    assert d.outcome is Outcome.ESCALATE


def test_credit_limit_escalates_on_income_cap():
    # <= 2x current (allowed by multiple) but > 3x monthly income -> escalate.
    ctx = good_ctx(current_credit_limit_minor=10_000_000, monthly_income_minor=4_000_000)
    d = engine.decide(
        ServicingType.CREDIT_LIMIT_INCREASE, {"requested_limit_minor": 15_000_000}, ctx
    )
    assert d.outcome is Outcome.ESCALATE
    assert d.rule == "credit_limit.income_cap"


def test_payment_date_change_range():
    assert (
        engine.decide(ServicingType.PAYMENT_DATE_CHANGE, {"new_day_of_month": 15}, good_ctx()).outcome
        is Outcome.ALLOW
    )
    assert (
        engine.decide(ServicingType.PAYMENT_DATE_CHANGE, {"new_day_of_month": 30}, good_ctx()).outcome
        is Outcome.DENY
    )


def test_contact_update():
    assert (
        engine.decide(ServicingType.CONTACT_UPDATE, {"field": "email"}, good_ctx()).outcome
        is Outcome.ALLOW
    )
    assert (
        engine.decide(ServicingType.CONTACT_UPDATE, {"field": "ssn"}, good_ctx()).outcome
        is Outcome.DENY
    )


def test_self_service_actions_allowed():
    for action in (
        ServicingType.CARD_REPLACEMENT,
        ServicingType.FREEZE_CARD,
        ServicingType.UNFREEZE_CARD,
        ServicingType.AUTOPAY_SETUP,
    ):
        assert engine.decide(action, {}, good_ctx()).outcome is Outcome.ALLOW


def test_dispute_and_fraud_escalate():
    assert engine.decide(ServicingType.DISPUTE, {}, good_ctx()).outcome is Outcome.ESCALATE
    assert engine.decide(ServicingType.REPORT_FRAUD, {}, good_ctx()).outcome is Outcome.ESCALATE
