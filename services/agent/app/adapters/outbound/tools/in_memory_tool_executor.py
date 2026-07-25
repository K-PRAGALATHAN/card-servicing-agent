"""In-memory tool executor (implements the ToolExecutor port).

Simulates performing a servicing action. Phase 1's API is the real target — an
HttpToolExecutor calling services/api slots in behind this same port later.
"""

from __future__ import annotations

from uuid import uuid4

from app.domain.conversation.servicing import ServicingType


class InMemoryToolExecutor:
    def execute(
        self, action: ServicingType, customer_id: str, slots: dict[str, object]
    ) -> dict[str, object]:
        return {
            "status": "executed",
            "action": action.value,
            "customer_id": customer_id,
            "reference": f"REF-{uuid4().hex[:10].upper()}",
            "slots": dict(slots),
        }
