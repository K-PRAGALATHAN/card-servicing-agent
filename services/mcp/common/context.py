"""Extract the customer bearer token from the current MCP HTTP request.

The agent's MCP client forwards the customer's `Authorization` header when it
opens the streamable-HTTP session; tools read it here and pass it to the API.
"""

from __future__ import annotations

from mcp.server.fastmcp import Context


def token_from_context(ctx: Context) -> str:
    request = getattr(ctx.request_context, "request", None)
    auth = ""
    if request is not None:
        auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise ValueError("Missing or invalid Authorization header on MCP request")
    return auth.split(" ", 1)[1].strip()
