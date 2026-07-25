"""FastAPI composition root for the agent service.

Later phases mount the LangGraph pipeline (injection guard -> classify ->
slot-fill -> policy engine -> confirm -> execute -> audit) behind this app.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI

from app.adapters.outbound.system_health import SystemHealthAdapter
from app.application.get_health import GetHealthUseCase


def create_app() -> FastAPI:
    app = FastAPI(title="Card Servicing Agent", version="0.0.0")
    get_health = GetHealthUseCase(SystemHealthAdapter("card-servicing-agent"))

    @app.get("/health")
    async def health() -> dict:
        return asdict(await get_health.execute())

    return app


app = create_app()
