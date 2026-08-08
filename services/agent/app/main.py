"""FastAPI composition root for the agent service.

Wires the Coordinator (router → specialist agents → MCP tools) to OpenRouter (the
single LLM, plus voice), the deterministic PolicyEngine, the hash-chained audit,
and the MongoDB session store. Authentication is token-based (shared JWT secret).
"""

from __future__ import annotations

import logging
import os
from dataclasses import asdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.inbound.http.agent_routes import create_agent_router
from app.adapters.inbound.http.auditor_routes import create_auditor_router
from app.adapters.inbound.http.auth import make_auth_dependency
from app.adapters.outbound.audit.in_memory_audit_log import InMemoryAuditLog
from app.adapters.outbound.audit.mongo_audit_log import MongoAuditLog
from app.adapters.outbound.guard.heuristic_injection_guard import HeuristicInjectionGuard
from app.application.auditor.auditor_service import AuditorService
from app.adapters.outbound.llm.openrouter_client import OpenRouterClient
from app.adapters.outbound.llm.openrouter_voice import OpenRouterVoice
from app.adapters.outbound.session.mongo_session_store import (
    InMemorySessionStore,
    MongoSessionStore,
)
from app.adapters.outbound.system_health import SystemHealthAdapter
from app.application.agent.coordinator import Coordinator
from app.application.get_health import GetHealthUseCase
from app.config import AppConfig
from app.domain.conversation.policy import PolicyEngine

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(levelname)s:%(name)s:%(message)s",
)


def create_app() -> FastAPI:
    config = AppConfig()
    api_key = config.require_openrouter()  # fail fast — no fallback

    llm = OpenRouterClient(api_key, config.openrouter_base_url, config.openrouter_model)
    voice = OpenRouterVoice(
        api_key,
        config.openrouter_base_url,
        config.openrouter_stt_model,
        config.openrouter_tts_model,
        config.openrouter_tts_voice,
    )
    audit = MongoAuditLog(config.mongo_url, config.mongo_db) if config.mongo_url else InMemoryAuditLog()
    coordinator = Coordinator(
        guard=HeuristicInjectionGuard(),
        llm=llm,
        policy=PolicyEngine(),
        audit=audit,
        config=config,
    )

    if config.mongo_url:
        sessions = MongoSessionStore(config.mongo_url, config.mongo_db)
        logger.info("Session store: MongoDB (%s)", config.mongo_db)
    else:
        sessions = InMemorySessionStore()
        logger.info("Session store: in-memory (set MONGO_URL for durable sessions)")

    auth_dep = make_auth_dependency(config)

    app = FastAPI(title="Card Servicing Agent", version="0.3.0")
    app.add_middleware(
        CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
    )

    get_health = GetHealthUseCase(SystemHealthAdapter("card-servicing-agent"))

    @app.get("/health")
    async def health() -> dict:
        return asdict(await get_health.execute())

    app.include_router(create_agent_router(coordinator, sessions, audit, voice, auth_dep))

    if config.mongo_url:
        auditor = AuditorService(config.mongo_url, config.mongo_db)
        app.include_router(create_auditor_router(auditor, config.auditor_key))
        logger.info("Auditor console API enabled at /auditor")

    return app


app = create_app()
