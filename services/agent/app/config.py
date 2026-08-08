"""Application configuration from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppConfig:
    host: str = os.getenv("AGENT_HOST", "0.0.0.0")
    port: int = int(os.getenv("AGENT_PORT", "8000"))
    env: str = os.getenv("APP_ENV", "development")
    # Intents classified below this confidence escalate to a human.
    confidence_threshold: float = float(os.getenv("AGENT_CONFIDENCE_THRESHOLD", "0.6"))
    # LLM: Claude when ANTHROPIC_API_KEY is set, else GPT-4 when OPENAI_API_KEY
    # is set, else the deterministic rule-based stand-in. The policy engine is
    # unaffected either way.
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-opus-5")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
