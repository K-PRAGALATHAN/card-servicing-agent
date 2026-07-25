"""FastAPI composition root for the agent service.

Wires the pipeline (guard -> classify -> slot-fill -> policy -> confirm ->
execute -> audit -> explain) to its adapters and mounts the HTTP + WebSocket
routes. Swap RuleBasedLanguageModel for a GPT-4 adapter, or InMemoryToolExecutor
for an HTTP one, without touching the pipeline.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI

from app.adapters.inbound.http.agent_routes import create_agent_router
from app.adapters.outbound.audit.in_memory_audit_log import InMemoryAuditLog
from app.adapters.outbound.context.static_context_provider import StaticContextProvider
from app.adapters.outbound.guard.heuristic_injection_guard import HeuristicInjectionGuard
from app.adapters.outbound.llm.rule_based_llm import RuleBasedLanguageModel
from app.adapters.outbound.system_health import SystemHealthAdapter
from app.adapters.outbound.tools.in_memory_tool_executor import InMemoryToolExecutor
from app.application.agent.pipeline import AgentPipeline
from app.application.agent.session_store import SessionStore
from app.application.get_health import GetHealthUseCase
from app.config import AppConfig
from app.domain.conversation.policy import PolicyEngine


def create_app() -> FastAPI:
    config = AppConfig()
    audit = InMemoryAuditLog()
    pipeline = AgentPipeline(
        guard=HeuristicInjectionGuard(),
        llm=RuleBasedLanguageModel(),
        policy=PolicyEngine(),
        tools=InMemoryToolExecutor(),
        audit=audit,
        context=StaticContextProvider(),
        confidence_threshold=config.confidence_threshold,
    )
    sessions = SessionStore()

    app = FastAPI(title="Card Servicing Agent", version="0.2.0")
    get_health = GetHealthUseCase(SystemHealthAdapter("card-servicing-agent"))

    @app.get("/health")
    async def health() -> dict:
        return asdict(await get_health.execute())

    app.include_router(create_agent_router(pipeline, sessions, audit))
    return app


app = create_app()
