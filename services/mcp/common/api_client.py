"""Thin HTTP client the MCP tools use to reach the Node API.

Every call carries the customer's bearer token, so the API enforces ownership
and scoping — the MCP layer never sees more than the authenticated customer can.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

API_BASE = os.getenv("API_BASE_URL", "http://localhost:4000")
_TIMEOUT = httpx.Timeout(15.0)


def _headers(token: str) -> dict[str, str]:
    return {"authorization": f"Bearer {token}", "content-type": "application/json"}


def api_get(path: str, token: str) -> Any:
    resp = httpx.get(f"{API_BASE}{path}", headers=_headers(token), timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def api_post(path: str, token: str, body: dict[str, Any] | None = None) -> Any:
    resp = httpx.post(
        f"{API_BASE}{path}",
        headers=_headers(token),
        content=json.dumps(body or {}),
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def as_json(value: Any) -> str:
    return json.dumps(value, default=str)
