# services/agent — Conversational AI Agent (FastAPI)

The LLM converses; a deterministic policy engine decides. This service will host the
LangGraph pipeline (injection guard → classify intent → slot-fill → policy engine →
confirm → execute tool → write audit → explain). See
[Phase 2](../../docs/phase-2-conversational-ai-agent.md).

Currently a Phase 0 skeleton exposing `GET /health`, structured hexagonally
(`app/domain`, `app/application`, `app/adapters`).

## Local development

```bash
cd services/agent
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
pytest
```
