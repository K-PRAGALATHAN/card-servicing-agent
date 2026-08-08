"""PII redaction.

Masks identifiers before text is sent to the external LLM (OpenRouter) or
written to logs. Grounding still works because tool *results* keep the real
figures the agent needs — we only scrub raw identifiers from free text.
"""

from __future__ import annotations

import re

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("PAN", re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")),
    ("AADHAAR", re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")),
    ("CARD", re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("PHONE", re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)")),
]


def redact(text: str) -> str:
    """Replaces recognised identifiers with typed placeholders, e.g. «PAN»."""
    if not text:
        return text
    out = text
    for label, pattern in _PATTERNS:
        out = pattern.sub(f"«{label}»", out)
    return out
