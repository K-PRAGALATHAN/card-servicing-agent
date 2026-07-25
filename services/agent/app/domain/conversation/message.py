"""Conversation messages. Pure domain — no framework imports."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum


class Role(str, Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    SYSTEM = "system"


@dataclass(frozen=True)
class Message:
    role: Role
    text: str
    created_at: str  # ISO-8601


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
