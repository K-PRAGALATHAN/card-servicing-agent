"""Application use case: orchestrates the domain through ports."""

from __future__ import annotations

from app.domain.health import HealthCheckPort, HealthStatus


class GetHealthUseCase:
    def __init__(self, health_check: HealthCheckPort) -> None:
        self._health_check = health_check

    async def execute(self) -> HealthStatus:
        return await self._health_check.check()
