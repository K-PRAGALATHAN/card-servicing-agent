"""Application configuration from environment variables.

The agent uses OpenRouter as its single LLM provider (chat, speech-to-text, and
text-to-speech). There is no rule-based fallback — a missing key fails fast.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class AppConfig:
    host: str = os.getenv("AGENT_HOST", "0.0.0.0")
    port: int = int(os.getenv("AGENT_PORT", "8000"))
    env: str = os.getenv("APP_ENV", "development")

    # Intents classified below this confidence escalate to a human.
    confidence_threshold: float = float(os.getenv("AGENT_CONFIDENCE_THRESHOLD", "0.6"))

    # ── OpenRouter (single LLM provider) ──────────────────────────
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    openrouter_stt_model: str = os.getenv("OPENROUTER_STT_MODEL", "openai/whisper-1")
    openrouter_tts_model: str = os.getenv("OPENROUTER_TTS_MODEL", "openai/gpt-4o-mini-tts")
    openrouter_tts_voice: str = os.getenv("OPENROUTER_TTS_VOICE", "alloy")

    # ── Auth (shared JWT secret with the Node API) ────────────────
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    # Static staff key gating the auditor console endpoints.
    auditor_key: str = os.getenv("AUDITOR_KEY", "audit-dev-key")

    # ── Session store (MongoDB) ───────────────────────────────────
    mongo_url: str = os.getenv("MONGO_URL", "")
    mongo_db: str = os.getenv("MONGO_DB", "card_servicing_agent")

    # ── Downstream services ───────────────────────────────────────
    api_base_url: str = os.getenv("API_BASE_URL", "http://localhost:4000")
    mcp_servers: dict[str, str] = field(
        default_factory=lambda: {
            "accounts": os.getenv("MCP_ACCOUNTS_URL", "http://localhost:9101/mcp"),
            "transactions": os.getenv("MCP_TRANSACTIONS_URL", "http://localhost:9102/mcp"),
            "servicing": os.getenv("MCP_SERVICING_URL", "http://localhost:9103/mcp"),
        }
    )

    def require_openrouter(self) -> str:
        if not self.openrouter_api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is required — the agent has no rule-based fallback."
            )
        return self.openrouter_api_key
