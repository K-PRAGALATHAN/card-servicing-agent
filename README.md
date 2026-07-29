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
  mobile/         Expo/React Native customer app       — @card/mobile (runs on web too)
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

# customer app in the browser (points at the running api + agent)
pnpm --filter @card/mobile exec expo start --web
```

Once running:

- Customer app (web): `http://localhost:8081` — log in as `NB00482193` / `password123`
- API docs (Swagger UI + OpenAPI): `http://localhost:4000/docs`
- Health checks: `http://localhost:4000/health` (api), `http://localhost:8000/health` (agent)
- Postgres is published on host port **5433** (container-internal 5432) to avoid clashes;
  override with `POSTGRES_HOST_PORT`.

### Persistence

The API persists to **PostgreSQL via Prisma** when `DATABASE_URL` is set, and falls back to
seeded **in-memory** repositories otherwise (tests + offline dev) — both sit behind the same
repository ports, so swapping one for the other touches nothing in the domain or HTTP layers.
The Docker stack applies migrations and seeds the demo data (`prisma migrate deploy` +
`prisma db seed`) automatically on start.

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
policy engine in Phase 2 decides approved/denied/escalated. `@fastify/cors` is enabled so
the customer web app can call the API directly from the browser.

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

The `LanguageModel` port has two adapters: an **OpenAI** model (used when `OPENAI_API_KEY`
is set — `OPENAI_MODEL` defaults to `gpt-4o`) and a deterministic **rule-based** stand-in
used otherwise, so the agent runs with or without a key and swapping the model changes
nothing else. The model only classifies intent and fills slots; on any LLM/parse error it
degrades safely to the rule-based path. Tool execution and customer context are simulated
in-memory; wiring them to the Phase 1 API is the next integration step.

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
  notification search, OpenAPI. Now persisted to **PostgreSQL via Prisma** behind the
  repository ports, with a seeded in-memory fallback for tests/offline dev.
- **Phase 2 — Conversational agent & policy engine** ✅ hexagonal agent pipeline
  (injection guard → classify → slot-fill → deterministic policy → confirm → execute →
  audit → explain), versioned policy rules, hash-chained audit, FastAPI + WebSocket.
  **OpenAI (gpt-4o)** adapter behind the `LanguageModel` port with a rule-based fallback.
- **Phase 3 — Customer app** ✅ Expo/React Native app (login, home, cards, AI chat,
  settings) running against the live API + agent; also runs on web in the browser.
- **Phase 4 — Auditor console** — next.

## Tech stack

React / Next.js / React Native · Node.js / FastAPI · GPT-4 (RAG + LangGraph) ·
PostgreSQL / MongoDB · AWS / GCP · Docker.
