"""In-memory conversation sessions.

Keeps per-conversation state between turns (HTTP is stateless). A durable store
(Redis/Postgres) replaces this behind the same shape in a later phase.
"""

from __future__ import annotations

from app.domain.conversation.turn import ConversationState


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ConversationState] = {}

    def get_or_create(self, conversation_id: str, customer_id: str) -> ConversationState:
        state = self._sessions.get(conversation_id)
        if state is None:
            state = ConversationState(conversation_id=conversation_id, customer_id=customer_id)
            self._sessions[conversation_id] = state
        return state

    def get(self, conversation_id: str) -> ConversationState | None:
        return self._sessions.get(conversation_id)
