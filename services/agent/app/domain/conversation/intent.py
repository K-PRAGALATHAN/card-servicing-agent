"""Intent classification result produced by the language model port."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from app.domain.conversation.servicing import ServicingType


class IntentKind(str, Enum):
    ACTION = "action"  # a servicing action request
    POLICY_QUERY = "policy_query"  # an informational question
    UNCERTAIN = "uncertain"  # not confidently understood -> escalate


@dataclass(frozen=True)
class ClassifiedIntent:
    kind: IntentKind
    confidence: float = 0.0
    action: ServicingType | None = None
    slots: dict[str, object] = field(default_factory=dict)
