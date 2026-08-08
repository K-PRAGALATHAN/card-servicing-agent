"""Auditor console HTTP surface (bank staff).

Gated by a static staff key (X-Auditor-Key) — separate from the customer JWT.
Read-mostly: inbox, transcript + tamper-verified decision trail, plus light case
metadata actions (assign / priority / resolve).
"""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from app.application.auditor.auditor_service import AuditorService


class AssignBody(BaseModel):
    assignee: str | None = None


class PriorityBody(BaseModel):
    priority: str


class StatusBody(BaseModel):
    status: str


def create_auditor_router(service: AuditorService, auditor_key: str) -> APIRouter:
    router = APIRouter(prefix="/auditor", tags=["auditor"])

    def _guard(x_auditor_key: str | None = Header(default=None)) -> None:
        if x_auditor_key != auditor_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auditor key")

    @router.get("/stats")
    async def stats(x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return service.stats()

    @router.get("/conversations")
    async def conversations(x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return {"conversations": service.list_conversations()}

    @router.get("/conversations/{conversation_id}")
    async def conversation(conversation_id: str, x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return service.get_conversation(conversation_id)

    @router.post("/conversations/{conversation_id}/assign")
    async def assign(conversation_id: str, body: AssignBody, x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return service.assign(conversation_id, body.assignee)

    @router.post("/conversations/{conversation_id}/priority")
    async def priority(conversation_id: str, body: PriorityBody, x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return service.set_priority(conversation_id, body.priority)

    @router.post("/conversations/{conversation_id}/status")
    async def set_status(conversation_id: str, body: StatusBody, x_auditor_key: str | None = Header(default=None)) -> dict:
        _guard(x_auditor_key)
        return service.set_status(conversation_id, body.status)

    return router
