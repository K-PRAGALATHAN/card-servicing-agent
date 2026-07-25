"""Static customer policy context (implements CustomerContextProvider).

Seeded to match the demo customer in services/api. A later adapter fetches this
from the API / core banking behind the same port.
"""

from __future__ import annotations

from app.domain.conversation.policy import CustomerPolicyContext

_DEMO_CUSTOMER_ID = "NB00482193"

_DEMO_CONTEXT = CustomerPolicyContext(
    fee_reversals_used_this_year=1,
    current_credit_limit_minor=18_000_000,  # ₹1,80,000 (matches API seed)
    monthly_income_minor=15_000_000,  # ₹1,50,000
    kyc_verified=True,
    account_in_good_standing=True,
)


class StaticContextProvider:
    def policy_context(self, customer_id: str) -> CustomerPolicyContext:
        if customer_id == _DEMO_CUSTOMER_ID:
            return _DEMO_CONTEXT
        return CustomerPolicyContext()
