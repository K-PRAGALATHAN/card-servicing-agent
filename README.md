# card-servicing-agent

A conversational card-servicing platform: a **customer mobile app**, a **bank auditor
console**, and an **LLM agent gated by a deterministic policy engine** — with a
hash-chained audit trail for every action. The LLM handles the conversation; policy
makes every decision.

## Monorepo layout

```text
services/
  api/            Node.js + Fastify API (hexagonal)   — @card/api
  agent/          FastAPI conversational agent (hexagonal)
apps/
  mobile/         React Native customer app            (Phase 3)
  console/        Next.js auditor console              (Phase 4)
packages/
  shared-types/   Cross-cutting DTOs                   — @card/shared-types
infra/
  docker/         docker-compose + Dockerfiles
docs/             Development plan & wireframes (git-ignored, local)
```

Architecture is hexagonal (ports & adapters): `domain → application → adapters`, wired
at a composition root. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Quick start

```bash
corepack enable            # or: npm i -g pnpm@9
pnpm install
cp .env.example .env

pnpm test                  # run workspace tests
pnpm dev                   # run dev servers

# full local stack (Postgres, Mongo, api, agent)
docker compose -f infra/docker/docker-compose.yml up --build
```

Once running:

- API docs (Swagger UI + OpenAPI): `http://localhost:4000/docs`
- Health checks: `http://localhost:4000/health` (api), `http://localhost:8000/health` (agent)
- Postgres is published on host port **5433** (container-internal 5432) to avoid clashes;
  override with `POSTGRES_HOST_PORT`.

## API (Phase 1)

The `@card/api` service exposes the customer-facing banking APIs. All routes except
`/auth/*` and `/health` require a `Bearer` access token (short-lived; refresh with
`/auth/refresh`).

| Method     | Path                                          | Description                                |
| ---------- | --------------------------------------------- | ------------------------------------------ |
| POST       | `/auth/login`                                 | Login with customer ID + password → tokens |
| POST       | `/auth/refresh`                               | Exchange a refresh token for new tokens    |
| POST       | `/auth/logout`                                | Logout (client discards tokens)            |
| GET        | `/me`                                         | Profile incl. KYC (never returns secrets)  |
| GET        | `/accounts`                                   | List the customer's accounts               |
| POST       | `/accounts/transfer`                          | Self-transfer between own accounts         |
| GET        | `/cards` · `/cards/:id`                       | List cards / card details                  |
| POST       | `/cards/:id/freeze` · `/unfreeze`             | Freeze / unfreeze a card                   |
| POST       | `/cards/:id/dispute` · `/report-fraud`        | Raise dispute / report fraud               |
| GET        | `/cards/:id/statement`                        | Latest statement for a card                |
| POST · GET | `/servicing/requests`                         | Create / list servicing requests           |
| GET        | `/notifications` · `/notifications/search?q=` | List / search notifications                |

**Servicing requests are created ungated (`pending`) in Phase 1** — the deterministic
policy engine in Phase 2 decides approved/denied/escalated.

### Try it (seeded demo data)

Log in via Swagger UI at `/docs`, or:

```bash
curl -s http://localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"customerId":"NB00482193","password":"password123"}'
# → { "accessToken": "...", "refreshToken": "...", "expiresInSeconds": ... }

curl -s http://localhost:4000/accounts -H "authorization: Bearer <accessToken>"
```

The seeded customer is _Klaus Crawley_ (`NB00482193`), matching the mobile wireframe.

## Agent (Phase 2)

The `agent` service runs the conversation. **The LLM converses; a deterministic policy
engine decides.** The model only classifies intent and fills slots — it can never
authorise or execute an action. Every message runs through the pipeline:

```
injection guard → classify intent → fill slots → policy engine
    → request confirmation → execute tool → write audit → explain
```

Nothing executes without an `allow` decision **and** an explicit customer confirmation,
and every executed/denied/escalated decision is appended to a **hash-chained audit
trail** (tamper-evident: recompute the chain and any change breaks the links).

| Method | Path                              | Description                                            |
| ------ | --------------------------------- | ------------------------------------------------------ |
| POST   | `/agent/message`                  | Run one turn — `{customer_id, text, conversation_id?}` |
| GET    | `/agent/conversations/{id}`       | Conversation transcript                                |
| GET    | `/agent/conversations/{id}/audit` | Hash-chained audit records                             |
| WS     | `/agent/ws`                       | Streaming turns (used by both frontends)               |

It runs with **no API key** today — a deterministic rule-based model stands in for GPT-4
behind the `LanguageModel` port (swap it, and nothing else changes). Tool execution and
customer context are simulated in-memory; wiring them to the Phase 1 API is the next
integration step.

```bash
# with the stack up, drive one turn:
curl -s http://localhost:8000/agent/message \
  -H 'content-type: application/json' \
  -d '{"customer_id":"NB00482193","text":"reverse the late fee on my credit card"}'
```

## Development plan

Phase-by-phase plan and frontend wireframes live in [`docs/`](docs/) (kept local; not
committed).

- **Phase 0 — Foundations** ✅ monorepo, hexagonal skeleton, Docker, CI.
- **Phase 1 — Core backend & domain** ✅ customer/account/card/statement/servicing/
  notification domains, JWT auth, self-transfer, card freeze, servicing requests,
  notification search, OpenAPI. Persistence is seeded in-memory behind repository
  ports (Postgres/Mongo adapters slot in without touching domain or HTTP).
- **Phase 2 — Conversational agent & policy engine** ✅ hexagonal agent pipeline
  (injection guard → classify → slot-fill → deterministic policy → confirm → execute →
  audit → explain), versioned policy rules, hash-chained audit, FastAPI + WebSocket.
  Rule-based LLM stand-in (swap for GPT-4) and in-memory tools/context.
- **Phase 3 / 4 — Customer app & auditor console** — next.

## Tech stack

React / Next.js / React Native · Node.js / FastAPI · GPT-4 (RAG + LangGraph) ·
PostgreSQL / MongoDB · AWS / GCP · Docker.
