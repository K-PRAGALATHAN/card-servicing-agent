# Contributing

## Prerequisites

- Node.js 24 (`.nvmrc`), pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- Python 3.11+ (for the agent service)
- Docker (for the local stack)

## Setup

```bash
pnpm install            # installs the JS/TS workspace + git hooks
cp .env.example .env    # then fill in secrets
```

## Everyday commands (run from repo root)

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Run all dev servers (Turborepo) |
| `pnpm test`      | Run tests across the workspace  |
| `pnpm lint`      | ESLint across packages          |
| `pnpm typecheck` | TypeScript, no emit             |
| `pnpm build`     | Build all packages              |
| `pnpm format`    | Prettier write                  |

Local full stack (Postgres, Mongo, api, agent):

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

## Architecture

Hexagonal (ports & adapters). Keep dependencies pointing inward:

```
domain   → entities, value objects, port interfaces (no framework imports)
application → use cases orchestrating the domain via ports
adapters → inbound (HTTP) and outbound (db, llm, queue) implementations
```

The composition root (e.g. `server.ts` / `main.py`) is the only place that wires
concrete adapters to ports.

## Commits

Conventional Commits, enforced by commitlint on `commit-msg`
(e.g. `feat(api): add card freeze use case`). `pre-commit` runs lint-staged.

## Branching

Branch off `main`; open a PR. CI must pass (Node + agent jobs) before merge.
