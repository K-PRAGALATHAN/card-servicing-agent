"""FastAPI inbound adapter for the agent.

Transport only — all logic lives in the Coordinator. Every route is
authenticated (bearer JWT); the customer identity comes from the token, never
the body. The coordinator runs in a worker thread (its LLM/MCP calls are sync),
and the MongoDB session is saved after each turn.
"""

from __future__ import annotations

import base64
from dataclasses import asdict
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.adapters.inbound.http.auth import AuthContext
from app.adapters.outbound.llm.openrouter_voice import OpenRouterVoice
from app.application.agent.coordinator import Coordinator
from app.domain.conversation.ports import AuditLog
from app.domain.conversation.turn import TurnResult


class MessageRequest(BaseModel):
    text: str
    conversation_id: str | None = None


def _turn_to_dict(conversation_id: str, result: TurnResult, transcript: str | None = None) -> dict[str, object]:
    decision = None
    if result.decision is not None:
        decision = {
            "outcome": result.decision.outcome.value,
            "rule": result.decision.rule,
            "reason": result.decision.reason,
            "version": result.decision.version,
        }
    payload: dict[str, object] = {
        "conversation_id": conversation_id,
        "kind": result.kind.value,
        "text": result.text,
        "action": result.action.value if result.action else None,
        "decision": decision,
        "escalated": result.escalated,
        "executed": result.executed,
        "audit_seq": result.audit_seq,
    }
    if transcript is not None:
        payload["transcript"] = transcript
    return payload


def create_agent_router(coordinator: Coordinator, sessions, audit: AuditLog, voice: OpenRouterVoice, auth_dep) -> APIRouter:
    router = APIRouter(prefix="/agent", tags=["agent"])

    def _owned_state(conversation_id: str | None, auth: AuthContext):
        cid = conversation_id or f"conv_{uuid4().hex[:12]}"
        state = sessions.get_or_create(cid, auth.customer_id)
        if state.customer_id != auth.customer_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")
        return cid, state

    @router.post("/message")
    async def message(body: MessageRequest, auth: AuthContext = Depends(auth_dep)) -> dict[str, object]:
        cid, state = _owned_state(body.conversation_id, auth)
        result = await run_in_threadpool(coordinator.handle, state, body.text, auth)
        await run_in_threadpool(sessions.save, state)
        return _turn_to_dict(cid, result)

    @router.post("/voice")
    async def voice_turn(
        audio: UploadFile = File(...),
        conversation_id: str | None = Form(default=None),
        auth: AuthContext = Depends(auth_dep),
    ) -> dict[str, object]:
        raw = await audio.read()
        transcript = await run_in_threadpool(voice.transcribe, raw, audio.filename or "speech.webm")
        cid, state = _owned_state(conversation_id, auth)
        result = await run_in_threadpool(coordinator.handle, state, transcript, auth)
        await run_in_threadpool(sessions.save, state)
        spoken = await run_in_threadpool(voice.synthesize, result.text)
        payload = _turn_to_dict(cid, result, transcript=transcript)
        payload["audio_base64"] = base64.b64encode(spoken).decode("ascii")
        payload["audio_mime"] = "audio/mpeg"
        return payload

    @router.get("/conversations/{conversation_id}")
    async def conversation(conversation_id: str, auth: AuthContext = Depends(auth_dep)) -> dict[str, object]:
        state = sessions.get(conversation_id)
        if state and state.customer_id != auth.customer_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your conversation")
        messages = [asdict(m) for m in state.messages] if state else []
        return {"conversation_id": conversation_id, "messages": messages}

    @router.get("/conversations/{conversation_id}/audit")
    async def conversation_audit(conversation_id: str, auth: AuthContext = Depends(auth_dep)) -> dict[str, object]:
        records = [asdict(r) for r in audit.for_conversation(conversation_id)]
        return {"conversation_id": conversation_id, "records": records}

    return router
