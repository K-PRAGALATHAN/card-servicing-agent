# services/agent — Conversational AI Agent (FastAPI)

**The LLM converses; a deterministic policy engine decides.** The model may classify
intent and fill slots, but it can never authorise or execute a servicing action — the
`PolicyEngine` does that, and every executed/denied/escalated decision is written to a
hash-chained audit trail. See [Phase 2](../../docs/phase-2-conversational-ai-agent.md).

## Pipeline (per customer message)

```
injection guard → classify intent → fill slots → policy engine
    → request confirmation → execute tool → write audit → explain
```

- **Injection guard** — flags prompt-injection/abuse → refuse.
- **Classify intent** — action vs policy query; low confidence → escalate.
- **Fill slots** — collect required fields, asking the customer in a loop.
- **Policy engine** — deterministic `allow` / `deny` / `escalate` (versioned rules).
- **Confirmation** — an allowed action executes only after an explicit "yes".
- **Execute + audit + explain** — run the tool, append an audit record, narrate.

## Architecture (hexagonal)

- `app/domain/conversation` — messages, intent, servicing slots, **PolicyEngine**,
  hash-chained **audit**, ports. Pure stdlib.
- `app/application/agent` — `AgentPipeline` (orchestration) + session store.
- `app/adapters/outbound` — heuristic injection guard, rule-based LLM (swap for GPT-4),
  in-memory hash-chained audit log, in-memory tool executor (swap for the API),
  static customer-context provider.
- `app/adapters/inbound/http` — FastAPI routes.

## HTTP API

| Method | Path                              | Description                                           |
| ------ | --------------------------------- | ----------------------------------------------------- |
| POST   | `/agent/message`                  | Run one turn: `{customer_id, text, conversation_id?}` |
| GET    | `/agent/conversations/{id}`       | Transcript                                            |
| GET    | `/agent/conversations/{id}/audit` | Hash-chained audit records                            |
| WS     | `/agent/ws`                       | Streaming turns (used by both frontends)              |
| GET    | `/health`                         | Health check                                          |

## Local development

```bash
cd services/agent
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
pytest        # core tests run without FastAPI; the HTTP health test needs it
ruff check .
```

> The domain/application/adapter **core is pure stdlib** and fully tested; FastAPI is
> only used by the inbound adapter. On Python versions without pydantic wheels, the
> core tests still run and the FastAPI health test skips.
