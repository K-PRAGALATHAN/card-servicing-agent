"""Token-based authentication for the agent.

Validates the same HS256 JWT the Node API issues (shared JWT_SECRET; subject =
customerId; typ = "access"). The verified subject is the trusted identity — the
request body's customer_id is never trusted. The raw token is threaded to the
MCP tools so every downstream API call is scoped to this customer.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, status

from app.config import AppConfig


@dataclass(frozen=True)
class AuthContext:
    customer_id: str
    token: str


def _decode(token: str, secret: str) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc
    if payload.get("typ") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expected access token")
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has no subject")
    return str(subject)


def make_auth_dependency(config: AppConfig):
    """Builds a FastAPI dependency that yields the authenticated AuthContext."""

    def authenticate(authorization: str | None = Header(default=None)) -> AuthContext:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
            )
        token = authorization.split(" ", 1)[1].strip()
        customer_id = _decode(token, config.jwt_secret)
        return AuthContext(customer_id=customer_id, token=token)

    return authenticate
