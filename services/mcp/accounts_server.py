"""Accounts MCP server — read-only tools over the customer's accounts & cards."""

from __future__ import annotations

import os

from mcp.server.fastmcp import Context, FastMCP

from common.api_client import api_get, as_json
from common.context import token_from_context

mcp = FastMCP("accounts", host="0.0.0.0", port=int(os.getenv("PORT", "9101")))


@mcp.tool()
def get_accounts(ctx: Context) -> str:
    """List the customer's bank accounts with live balances."""
    return as_json(api_get("/accounts", token_from_context(ctx)))


@mcp.tool()
def get_cards(ctx: Context) -> str:
    """List the customer's cards (type, network, status, tier, limits)."""
    return as_json(api_get("/cards", token_from_context(ctx)))


@mcp.tool()
def get_card(ctx: Context, card_id: str) -> str:
    """Get one card's details by id."""
    return as_json(api_get(f"/cards/{card_id}", token_from_context(ctx)))


@mcp.tool()
def get_credit_score(ctx: Context) -> str:
    """Get the customer's CIBIL-style credit score and its factors."""
    return as_json(api_get("/credit-score", token_from_context(ctx)))


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
