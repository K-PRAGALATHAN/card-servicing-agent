"""A read-only specialist agent (Accounts / Transactions lanes).

Runs a tool-calling loop against its MCP server to fetch the customer's real
data, then composes a grounded answer. Read tools change nothing, so no policy
or confirmation is needed here — but the model must only state figures the tools
returned (the grounding rule), never invented ones.
"""

from __future__ import annotations

from app.adapters.outbound.llm.openrouter_client import OpenRouterClient, ToolTrace
from app.adapters.outbound.mcp.mcp_client import McpClient
from app.domain.conversation.message import Message

_GROUNDING = (
    "You are a bank card-servicing assistant. Answer the customer's question using "
    "ONLY the data returned by your tools — never invent balances, limits, dates, or "
    "figures. Call tools to fetch what you need. If the tools don't have the answer, "
    "say so. Be concise and friendly. You never decide, promise, or authorise actions.\n"
    "MONEY FORMAT: every money value from the tools is an integer in paise (minor "
    "units), where ₹1 = 100 paise. Always divide by 100 and present rupees to the "
    "customer, formatted like ₹2,48,905.60 (Indian digit grouping). Never read the "
    "raw paise number aloud."
)


class ReadAgent:
    def __init__(self, llm: OpenRouterClient, mcp_url: str, focus: str) -> None:
        self._llm = llm
        self._mcp_url = mcp_url
        self._focus = focus  # short description of this lane's scope

    def answer(self, token: str, history: list[Message], user_text: str) -> tuple[str, ToolTrace]:
        client = McpClient(self._mcp_url, token)
        tools = client.openai_tools()
        system = f"{_GROUNDING}\nYour focus: {self._focus}."
        messages = [
            *({"role": "user" if m.role.value == "customer" else "assistant", "content": m.text} for m in history[-6:]),
            {"role": "user", "content": user_text},
        ]
        return self._llm.run_agent_loop(
            system=system, messages=messages, tools=tools, dispatch=client.call
        )
