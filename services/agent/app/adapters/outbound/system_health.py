"""Outbound adapter implementing HealthCheckPort against the process."""

from __future__ import annotations

from datetime import UTC, datetime

from app.domain.health import HealthStatus


class SystemHealthAdapter:
    def __init__(self, service_name: str) -> None:
        self._service_name = service_name

    async def check(self) -> HealthStatus:
        return HealthStatus(
            service=self._service_name,
            state="healthy",
            checked_at=datetime.now(UTC).isoformat(),
        )
