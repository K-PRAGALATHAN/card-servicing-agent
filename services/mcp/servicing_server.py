"""Servicing MCP server — write tools that apply servicing actions.

These are only ever invoked by the agent's Servicing lane *after* the
deterministic policy engine returns ALLOW and the customer confirms. Each tool
calls the Node API (scoped by the bearer token) which performs the real change.
"""

from __future__ import annotations

import os

from mcp.server.fastmcp import Context, FastMCP

from common.api_client import api_post, as_json
from common.context import token_from_context

mcp = FastMCP("servicing", host="0.0.0.0", port=int(os.getenv("PORT", "9103")))


@mcp.tool()
def reverse_fee(ctx: Context, card_id: str, fee_amount_minor: int) -> str:
    """Reverse a fee on a card — credits the customer's account (paise)."""
    return as_json(
        api_post(f"/cards/{card_id}/reverse-fee", token_from_context(ctx), {"feeAmountMinor": fee_amount_minor})
    )


@mcp.tool()
def modify_credit_limit(ctx: Context, card_id: str, new_limit_minor: int) -> str:
    """Set a new credit limit on a credit card (paise)."""
    return as_json(
        api_post(f"/cards/{card_id}/credit-limit", token_from_context(ctx), {"newLimitMinor": new_limit_minor})
    )


@mcp.tool()
def replace_card(ctx: Context, card_id: str, reason: str = "customer_request") -> str:
    """Replace a card — blocks the old one and issues a new one."""
    return as_json(api_post(f"/cards/{card_id}/replace", token_from_context(ctx), {"reason": reason}))


@mcp.tool()
def freeze_card(ctx: Context, card_id: str) -> str:
    """Freeze a card (temporarily block transactions)."""
    return as_json(api_post(f"/cards/{card_id}/freeze", token_from_context(ctx)))


@mcp.tool()
def unfreeze_card(ctx: Context, card_id: str) -> str:
    """Unfreeze a previously frozen card."""
    return as_json(api_post(f"/cards/{card_id}/unfreeze", token_from_context(ctx)))


@mcp.tool()
def reset_pin(ctx: Context, card_id: str, pin: str) -> str:
    """Set a new 4-digit ATM PIN on a card."""
    return as_json(api_post(f"/cards/{card_id}/reset-pin", token_from_context(ctx), {"pin": pin}))


@mcp.tool()
def raise_dispute(ctx: Context, card_id: str) -> str:
    """Raise a dispute on a card charge."""
    return as_json(api_post(f"/cards/{card_id}/dispute", token_from_context(ctx)))


@mcp.tool()
def report_fraud(ctx: Context, card_id: str) -> str:
    """Report fraud on a card (security team)."""
    return as_json(api_post(f"/cards/{card_id}/report-fraud", token_from_context(ctx)))


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
