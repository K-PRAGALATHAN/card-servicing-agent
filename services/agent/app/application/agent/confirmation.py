"""Deterministic yes/no parsing for the confirmation step (no LLM needed)."""

from __future__ import annotations

_YES = {"yes", "y", "yeah", "yep", "confirm", "confirmed", "proceed", "ok", "okay", "sure", "go"}
_NO = {"no", "n", "nope", "cancel", "stop", "don't", "dont", "nevermind", "abort"}


def parse_confirmation(text: str) -> bool | None:
    """True (confirm), False (decline), or None (unclear)."""
    tokens = {t.strip(".,!?").lower() for t in text.split()}
    if tokens & _YES:
        return True
    if tokens & _NO:
        return False
    return None
