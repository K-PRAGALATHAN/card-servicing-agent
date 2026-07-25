"""Domain: health value object and outbound port.

Pure domain — no FastAPI, no I/O. The application depends on the Protocol,
adapters implement it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

ServiceState = Literal["healthy", "degraded", "unhealthy"]


@dataclass(frozen=True)
class HealthStatus:
    service: str
    state: ServiceState
    checked_at: str  # ISO-8601


class HealthCheckPort(Protocol):
    async def check(self) -> HealthStatus: ...
