"""Transactions MCP server — read tools over the ledger, statements & spend."""

from __future__ import annotations

import os
from collections import defaultdict
from typing import Any

from mcp.server.fastmcp import Context, FastMCP

from common.api_client import api_get, as_json
from common.context import token_from_context

mcp = FastMCP("transactions", host="0.0.0.0", port=int(os.getenv("PORT", "9102")))


@mcp.tool()
def list_transactions(ctx: Context, limit: int = 20) -> str:
    """List the customer's recent transactions (newest first)."""
    return as_json(api_get(f"/transactions?limit={limit}", token_from_context(ctx)))


@mcp.tool()
def get_statement(ctx: Context, card_id: str) -> str:
    """Get the latest statement for a card, with its line items."""
    return as_json(api_get(f"/cards/{card_id}/statement", token_from_context(ctx)))


@mcp.tool()
def summarize_spend(ctx: Context, limit: int = 40) -> str:
    """Summarise recent debit spend grouped by category (paise totals)."""
    txns: list[dict[str, Any]] = api_get(f"/transactions?limit={limit}", token_from_context(ctx))
    totals: dict[str, int] = defaultdict(int)
    for t in txns:
        if t.get("direction") == "debit":
            totals[t.get("category", "other")] += int(t.get("amount", {}).get("amountMinor", 0))
    return as_json({"by_category_minor": dict(totals), "count": len(txns)})


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
