# syntax=docker/dockerfile:1
# Build context is the repo root (see docker-compose.yml).
# Single-stage for Phase 0 reliability; multi-stage size optimization is a Phase 6 task.
FROM node:24-slim
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

# Install deps for the api workspace (layer cached unless manifests change).
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY services/api/package.json ./services/api/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN pnpm install --filter @card/api... --no-frozen-lockfile

# Copy sources, generate the Prisma client, and build.
COPY . .
RUN pnpm --filter @card/api exec prisma generate
RUN pnpm --filter @card/api build

EXPOSE 4000
WORKDIR /repo/services/api
# Apply migrations and seed (idempotent) before starting the server.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/main.js"]
