# syntax=docker/dockerfile:1
# Shared image for the three MCP servers. Build context is the repo root.
# The compose service picks which server to run via `command`.
FROM python:3.12-slim
WORKDIR /app

COPY services/mcp/ ./
RUN pip install --no-cache-dir .

# Default port; each compose service overrides PORT + command.
CMD ["python", "accounts_server.py"]
