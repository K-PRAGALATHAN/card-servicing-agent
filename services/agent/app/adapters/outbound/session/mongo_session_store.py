"""MongoDB-backed session store.

Persists per-conversation history and inter-agent shared state so context
survives restarts and is visible to every agent. Same shape as the old
in-memory store, plus an explicit `save()` (Mongo needs a write after mutation).
"""

from __future__ import annotations

from app.domain.conversation.message import Message, Role
from app.domain.conversation.servicing import ServicingType
from app.domain.conversation.turn import ConversationPhase, ConversationState


def _to_doc(state: ConversationState) -> dict[str, object]:
    return {
        "_id": state.conversation_id,
        "customer_id": state.customer_id,
        "phase": state.phase.value,
        "pending_action": state.pending_action.value if state.pending_action else None,
        "slots": state.slots,
        "shared": state.shared,
        "messages": [{"role": m.role.value, "text": m.text, "created_at": m.created_at} for m in state.messages],
    }


def _from_doc(doc: dict[str, object]) -> ConversationState:
    pending = doc.get("pending_action")
    return ConversationState(
        conversation_id=str(doc["_id"]),
        customer_id=str(doc["customer_id"]),
        phase=ConversationPhase(str(doc.get("phase", "idle"))),
        pending_action=ServicingType(pending) if pending else None,
        slots=dict(doc.get("slots") or {}),
        messages=[
            Message(Role(m["role"]), m["text"], m["created_at"])
            for m in (doc.get("messages") or [])  # type: ignore[union-attr]
        ],
        shared=dict(doc.get("shared") or {}),
    )


class MongoSessionStore:
    def __init__(self, mongo_url: str, db_name: str) -> None:
        from pymongo import MongoClient

        self._col = MongoClient(mongo_url)[db_name]["sessions"]

    def get_or_create(self, conversation_id: str, customer_id: str) -> ConversationState:
        doc = self._col.find_one({"_id": conversation_id})
        if doc is None:
            state = ConversationState(conversation_id=conversation_id, customer_id=customer_id)
            self.save(state)
            return state
        return _from_doc(doc)

    def get(self, conversation_id: str) -> ConversationState | None:
        doc = self._col.find_one({"_id": conversation_id})
        return _from_doc(doc) if doc else None

    def save(self, state: ConversationState) -> None:
        self._col.replace_one({"_id": state.conversation_id}, _to_doc(state), upsert=True)


class InMemorySessionStore:
    """Used only by unit tests / eval; production uses MongoDB."""

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

    def save(self, state: ConversationState) -> None:
        self._sessions[state.conversation_id] = state
