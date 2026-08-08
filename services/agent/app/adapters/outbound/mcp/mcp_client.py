"""Agent-side MCP client.

Connects to a true MCP server over streamable HTTP, forwarding the customer's
bearer token so the server (and the API behind it) stays scoped to that
customer. Exposes a *sync* surface (the orchestration runs in a worker thread,
so `asyncio.run` per call is safe) with two operations the specialist agents
need: list the server's tools as OpenAI tool schemas, and call a tool by name.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any


class McpClient:
    def __init__(self, url: str, token: str) -> None:
        self._url = url
        self._headers = {"authorization": f"Bearer {token}"}

    # ── public sync surface ────────────────────────────────────
    def openai_tools(self) -> list[dict[str, Any]]:
        """This server's tools as OpenAI function-tool schemas for the LLM."""
        tools = asyncio.run(self._list_tools())
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description or "",
                    "parameters": t.inputSchema or {"type": "object", "properties": {}},
                },
            }
            for t in tools
        ]

    def call(self, name: str, arguments: dict[str, Any]) -> str:
        """Invoke a tool and return its textual result (JSON string)."""
        try:
            return asyncio.run(self._call_tool(name, arguments))
        except Exception as exc:  # noqa: BLE001 — surface tool errors to the model
            return json.dumps({"error": str(exc)})

    # ── async internals ────────────────────────────────────────
    async def _list_tools(self):
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client

        async with streamablehttp_client(self._url, headers=self._headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                return (await session.list_tools()).tools

    async def _call_tool(self, name: str, arguments: dict[str, Any]) -> str:
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client

        async with streamablehttp_client(self._url, headers=self._headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(name, arguments)
                parts = [c.text for c in result.content if getattr(c, "type", None) == "text"]
                return "\n".join(parts) if parts else "{}"
