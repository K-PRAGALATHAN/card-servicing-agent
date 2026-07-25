"""Heuristic prompt-injection / abuse guard.

Deterministic pattern matching as a first line of defence. Phase 5 grows this
into a maintained adversarial corpus (and can add a model-based classifier
behind the same port).
"""

from __future__ import annotations

import re

_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"ignore (all|any|previous|prior) (instructions|prompts)",
        r"disregard (the|all|previous) (above|instructions|rules)",
        r"you are now (a|an|dan|developer mode)",
        r"system prompt",
        r"reveal|print|show me (your|the) (prompt|instructions|system)",
        r"pretend to be",
        r"jailbreak",
        r"act as (a|an) (unrestricted|unfiltered)",
    )
)


class HeuristicInjectionGuard:
    def is_flagged(self, text: str) -> bool:
        return any(pattern.search(text) for pattern in _PATTERNS)
