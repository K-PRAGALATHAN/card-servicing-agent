"""Per-conversation state and the result of a single agent turn."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from app.domain.conversation.message import Message
from app.domain.conversation.policy import PolicyDecision
from app.domain.conversation.servicing import ServicingType


class ConversationPhase(str, Enum):
    IDLE = "idle"
    COLLECTING = "collecting"  # gathering required slots
    AWAITING_CONFIRMATION = "awaiting_confirmation"


class ReplyKind(str, Enum):
    REFUSE = "refuse"  # injection guard blocked it
    ASK = "ask"  # need more information (slot-fill)
    CONFIRM = "confirm"  # allowed; awaiting customer confirmation
    ANSWER = "answer"  # informational (policy query)
    EXPLAIN = "explain"  # outcome explanation (executed / denied / cancelled)
    ESCALATE = "escalate"  # handed to a human


@dataclass
class ConversationState:
    conversation_id: str
    customer_id: str
    phase: ConversationPhase = ConversationPhase.IDLE
    pending_action: ServicingType | None = None
    slots: dict[str, object] = field(default_factory=dict)
    messages: list[Message] = field(default_factory=list)
    # Inter-agent shared state / working memory (routing hints, last specialist,
    # durable facts). Volatile financial values are never cached here.
    shared: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class TurnResult:
    kind: ReplyKind
    text: str
    action: ServicingType | None = None
    decision: PolicyDecision | None = None
    escalated: bool = False
    executed: bool = False
    audit_seq: int | None = None
