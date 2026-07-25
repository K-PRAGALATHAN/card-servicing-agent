"""FastAPI inbound adapter for the agent.

Exposes a REST turn endpoint, a conversation transcript+audit view, and a
WebSocket for streaming turns (used by both frontends). Transport only — all
logic lives in the pipeline.
"""

from __future__ import annotations

from dataclasses import asdict
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.application.agent.pipeline import AgentPipeline
from app.application.agent.session_store import SessionStore
from app.domain.conversation.ports import AuditLog
from app.domain.conversation.turn import TurnResult


class MessageRequest(BaseModel):
    customer_id: str
    text: str
    conversation_id: str | None = None


def _turn_to_dict(conversation_id: str, result: TurnResult) -> dict[str, object]:
    decision = None
    if result.decision is not None:
        decision = {
            "outcome": result.decision.outcome.value,
            "rule": result.decision.rule,
            "reason": result.decision.reason,
            "version": result.decision.version,
        }
    return {
        "conversation_id": conversation_id,
        "kind": result.kind.value,
        "text": result.text,
        "action": result.action.value if result.action else None,
        "decision": decision,
        "escalated": result.escalated,
        "executed": result.executed,
        "audit_seq": result.audit_seq,
    }


def create_agent_router(
    pipeline: AgentPipeline,
    sessions: SessionStore,
    audit: AuditLog,
) -> APIRouter:
    router = APIRouter(prefix="/agent", tags=["agent"])

    @router.post("/message")
    async def message(body: MessageRequest) -> dict[str, object]:
        conversation_id = body.conversation_id or f"conv_{uuid4().hex[:12]}"
        state = sessions.get_or_create(conversation_id, body.customer_id)
        result = pipeline.handle(state, body.text)
        return _turn_to_dict(conversation_id, result)

    @router.get("/conversations/{conversation_id}")
    async def conversation(conversation_id: str) -> dict[str, object]:
        state = sessions.get(conversation_id)
        messages = [asdict(m) for m in state.messages] if state else []
        return {"conversation_id": conversation_id, "messages": messages}

    @router.get("/conversations/{conversation_id}/audit")
    async def conversation_audit(conversation_id: str) -> dict[str, object]:
        records = [asdict(r) for r in audit.for_conversation(conversation_id)]
        return {"conversation_id": conversation_id, "records": records}

    @router.websocket("/ws")
    async def ws(websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                payload = await websocket.receive_json()
                conversation_id = payload.get("conversation_id") or f"conv_{uuid4().hex[:12]}"
                state = sessions.get_or_create(conversation_id, payload["customer_id"])
                result = pipeline.handle(state, payload["text"])
                await websocket.send_json(_turn_to_dict(conversation_id, result))
        except WebSocketDisconnect:
            return

    return router
