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

Health checks once running: `http://localhost:4000/health` (api) and
`http://localhost:8000/health` (agent).

## Development plan

Phase-by-phase plan and frontend wireframes live in [`docs/`](docs/) (kept local; not
committed). Current status: **Phase 0 — Foundations** complete (monorepo, hexagonal
skeleton, health vertical slice, Docker, CI).

## Tech stack

React / Next.js / React Native · Node.js / FastAPI · GPT-4 (RAG + LangGraph) ·
PostgreSQL / MongoDB · AWS / GCP · Docker.
