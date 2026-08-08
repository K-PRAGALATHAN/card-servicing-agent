"""FastAPI composition root for the agent service.

Wires the pipeline (guard -> classify -> slot-fill -> policy -> confirm ->
execute -> audit -> explain) to its adapters and mounts the HTTP + WebSocket
routes. Swap RuleBasedLanguageModel for a GPT-4 adapter, or InMemoryToolExecutor
for an HTTP one, without touching the pipeline.
"""

from __future__ import annotations

import logging
import os
from dataclasses import asdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from app.domain.conversation.ports import LanguageModel

logger = logging.getLogger(__name__)

# Without this the app's own INFO/WARNING records are swallowed by the root
# logger's default level — which is how a dead LLM looked like a confused
# customer. LOG_LEVEL=DEBUG for more.
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(levelname)s:%(name)s:%(message)s",
)


def _build_llm(config: AppConfig) -> LanguageModel:
    """Claude, else GPT-4, else the deterministic stand-in — whichever is keyed."""
    if config.anthropic_api_key:
        from app.adapters.outbound.llm.anthropic_llm import AnthropicLanguageModel

        logger.info("LLM: Claude (%s)", config.anthropic_model)
        return AnthropicLanguageModel(config.anthropic_api_key, config.anthropic_model)
    if config.openai_api_key:
        from app.adapters.outbound.llm.openai_llm import OpenAILanguageModel

        logger.info("LLM: OpenAI (%s)", config.openai_model)
        return OpenAILanguageModel(config.openai_api_key, config.openai_model)
    logger.info("LLM: rule-based stand-in (no API key configured)")
    return RuleBasedLanguageModel()


def create_app() -> FastAPI:
    config = AppConfig()
    audit = InMemoryAuditLog()
    pipeline = AgentPipeline(
        guard=HeuristicInjectionGuard(),
        llm=_build_llm(config),
        policy=PolicyEngine(),
        tools=InMemoryToolExecutor(),
        audit=audit,
        context=StaticContextProvider(),
        confidence_threshold=config.confidence_threshold,
    )
    sessions = SessionStore()

    app = FastAPI(title="Card Servicing Agent", version="0.2.0")
    # Dev-friendly CORS so the Expo web app (a browser origin) can call the agent.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    get_health = GetHealthUseCase(SystemHealthAdapter("card-servicing-agent"))

    @app.get("/health")
    async def health() -> dict:
        return asdict(await get_health.execute())

    app.include_router(create_agent_router(pipeline, sessions, audit))
    return app


app = create_app()
