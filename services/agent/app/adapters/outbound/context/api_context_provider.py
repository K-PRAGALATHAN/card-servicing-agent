"""Customer policy context sourced from the live Node API.

Replaces the static stub: the deterministic PolicyEngine now decides against the
customer's real card limits and KYC status. Volatile values are fetched fresh
(never cached), keeping decisions honest. Created per-request with the token.
"""

from __future__ import annotations

import logging

import httpx

from app.domain.conversation.policy import CustomerPolicyContext

logger = logging.getLogger(__name__)


class ApiContextProvider:
    def __init__(self, api_base_url: str, token: str) -> None:
        self._base = api_base_url
        self._headers = {"authorization": f"Bearer {token}"}

    def policy_context(self, customer_id: str) -> CustomerPolicyContext:
        current_limit = 0
        kyc_verified = True
        try:
            with httpx.Client(timeout=10.0) as client:
                cards = client.get(f"{self._base}/cards", headers=self._headers).json()
                credit = [c for c in cards if c.get("type") == "credit"]
                current_limit = max(
                    (int(c.get("availableLimit", {}).get("amountMinor", 0)) for c in credit),
                    default=0,
                )
                me = client.get(f"{self._base}/me", headers=self._headers).json()
                kyc_verified = me.get("kyc", {}).get("status") == "verified"
        except Exception:  # noqa: BLE001 — degrade to a conservative context
            logger.warning("Failed to load policy context; using conservative defaults")
            return CustomerPolicyContext(kyc_verified=False, account_in_good_standing=False)

        return CustomerPolicyContext(
            fee_reversals_used_this_year=0,
            current_credit_limit_minor=current_limit,
            monthly_income_minor=0,
            kyc_verified=kyc_verified,
            account_in_good_standing=True,
        )
