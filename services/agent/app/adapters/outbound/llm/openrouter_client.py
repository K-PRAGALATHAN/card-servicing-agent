"""OpenRouter LLM client — the agent's single brain.

OpenRouter is OpenAI-compatible, so we use the OpenAI SDK pointed at it. This
client exposes plain completions, JSON completions, and a reusable tool-calling
loop the specialist agents drive against their MCP tools. It only *converses* —
the deterministic PolicyEngine still decides, and writes still require an ALLOW
decision plus explicit confirmation.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# A dispatcher runs one tool call and returns its result as a JSON string.
ToolDispatch = Callable[[str, dict[str, Any]], str]


@dataclass
class ToolTrace:
    """Records the read/write tools a turn actually invoked (for grounding + audit)."""

    calls: list[dict[str, Any]] = field(default_factory=list)

    def record(self, name: str, arguments: dict[str, Any], result: str) -> None:
        self.calls.append({"name": name, "arguments": arguments, "result": result})


class OpenRouterClient:
    def __init__(self, api_key: str, base_url: str, model: str) -> None:
        from openai import OpenAI

        self._client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            default_headers={
                "HTTP-Referer": "https://localhost",
                "X-Title": "Card Servicing Agent",
            },
        )
        self._model = model

    # ── plain completions ──────────────────────────────────────
    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    def complete_json(self, system: str, user: str) -> dict[str, Any]:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        try:
            return json.loads(resp.choices[0].message.content or "{}")
        except json.JSONDecodeError:
            return {}

    # ── tool-calling loop ──────────────────────────────────────
    def run_agent_loop(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        dispatch: ToolDispatch,
        max_iters: int = 6,
        temperature: float = 0,
    ) -> tuple[str, ToolTrace]:
        """Drives a tool-calling loop: the model proposes tool calls, we execute
        them via `dispatch`, feed results back, and repeat until it answers."""
        trace = ToolTrace()
        convo: list[dict[str, Any]] = [{"role": "system", "content": system}, *messages]

        for _ in range(max_iters):
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=convo,
                tools=tools or None,
                temperature=temperature,
            )
            choice = resp.choices[0].message
            tool_calls = choice.tool_calls or []

            if not tool_calls:
                return choice.content or "", trace

            convo.append(
                {
                    "role": "assistant",
                    "content": choice.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in tool_calls
                    ],
                }
            )
            for tc in tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = dispatch(tc.function.name, args)
                trace.record(tc.function.name, args, result)
                convo.append({"role": "tool", "tool_call_id": tc.id, "content": result})

        # Ran out of iterations — make one final answer attempt without tools.
        resp = self._client.chat.completions.create(
            model=self._model, messages=convo, temperature=temperature
        )
        return resp.choices[0].message.content or "", trace
