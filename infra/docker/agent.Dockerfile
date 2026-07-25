# syntax=docker/dockerfile:1
# Build context is the repo root (see docker-compose.yml).
FROM python:3.12-slim
WORKDIR /app

COPY services/agent/ ./
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
