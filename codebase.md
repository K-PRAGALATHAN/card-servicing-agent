# Codebase Guide — read this first

Welcome to the team! 👋

This document explains **everything** in this project in plain English. It assumes you
have **never** used most of these tools (pnpm, monorepos, Docker, etc.). By the end you'll
understand _what_ each piece is, _why_ it's here, and _where_ to look. Take it slowly — you
don't need to memorise anything.

---

## 1. What are we building? (the 30-second version)

A **bank card-servicing platform**. Imagine a customer opens a banking app, taps "Chat with
support", and types _"please reverse the late fee on my credit card."_ Instead of waiting for
a human agent, an **AI assistant** understands the request and handles it — but with a strict
safety rule:

> **The AI is only allowed to _talk_. It is NEVER allowed to _decide_.**
> A separate, boring, predictable piece of code (the "policy engine") makes every real
> decision: allow it, deny it, or send it to a human.

And **every** decision is written into a tamper-proof logbook (the "audit trail"), so a bank
auditor can later prove exactly what happened and that nothing was faked.

That one idea — **"the AI converses, the policy decides"** — is the heart of the whole project.
Keep it in your head; everything else serves it.

---

## 2. The three apps in this project

This is not one program. It's **three separate programs** that talk to each other over the
network:

| #   | Name                           | What it is                                                                    | Language                  | Runs on       |
| --- | ------------------------------ | ----------------------------------------------------------------------------- | ------------------------- | ------------- |
| 1   | **API** (`services/api`)       | The bank's brain: accounts, cards, statements, login. The "source of truth."  | TypeScript (Node.js)      | port **4000** |
| 2   | **Agent** (`services/agent`)   | The AI chat brain: understands messages, applies policy, keeps the audit log. | Python                    | port **8000** |
| 3   | **Mobile app** (`apps/mobile`) | What the customer sees and taps. Also runs in a web browser.                  | TypeScript (React Native) | port **8081** |

A 4th app, the **auditor console** (`apps/console`), is planned but not built yet — that's the
screen a bank employee would use to review conversations.

Think of it like a restaurant:

- **Mobile app** = the menu and table the customer interacts with.
- **API** = the kitchen that actually has the food (the real data).
- **Agent** = the smart waiter who takes your order in plain language but must follow the
  restaurant's rules before serving anything.

---

## 3. "Monorepo" — why is everything in one folder?

Normally each app would live in its **own** Git repository. Here, all three apps live in **one
single repository**. That's called a **monorepo** ("mono" = one, "repo" = repository).

**Why do this?**

- The apps **share code**. For example, the shape of a "Card" (its fields) is defined once and
  used by multiple apps. In separate repos you'd have to copy-paste and keep them in sync.
- **One place** to clone, one place to see all changes, one set of rules for everyone.
- You can change the API and the app that uses it **in the same commit**.

The trade-off is that a monorepo needs special tools to manage "multiple apps in one folder" —
which is exactly what **pnpm** and **Turborepo** (below) are for.

### The top-level folders

```
card-servicing-agent/
├── services/        ← the back-end programs (the "servers")
│   ├── api/         ← Bank API (TypeScript/Node)
│   └── agent/       ← AI Agent (Python)
├── apps/            ← the front-end programs (what people look at)
│   ├── mobile/      ← Customer app (React Native, also web)
│   └── console/     ← Auditor console (planned, not built)
├── packages/        ← shared code used by multiple apps
│   └── shared-types/  ← common data shapes (e.g. what a "Card" looks like)
├── infra/           ← "infrastructure": Docker files to run everything
│   └── docker/
├── .github/         ← automation that runs on GitHub (CI)
├── package.json     ← the root project settings + shared tools
└── README.md        ← the short project overview
```

A key habit: **each app has its OWN `package.json`** (its own list of dependencies), _and_
there's one at the root for shared tools. That's normal for a monorepo.

---

## 4. The tools & frameworks — what each is and WHY we chose it

This is the part that feels overwhelming at first. Don't worry — you interact with most of
these only occasionally. Here's the full list, grouped, with the reason each exists.

### 4a. Managing the monorepo

**pnpm** (say "p-n-p-m") — _the package manager._

- **What:** it downloads and installs the libraries (dependencies) each app needs, like `npm`
  or `yarn` if you've seen those.
- **Why this one:** it's fast and it's excellent at monorepos. It has a built-in idea of a
  "workspace" — meaning it understands "this folder has several apps" and can install them all
  together and let them share code. It also saves disk space by storing each library once on
  your machine instead of copying it into every app.
- **You'll type:** `pnpm install` (set everything up), `pnpm dev` (run), `pnpm test`.
- **Gotcha for you:** pnpm stores libraries in a nested/linked way (not one big flat folder).
  That's more correct but sometimes tools need extra config to find files — you'll see comments
  in the code mentioning this (e.g. in the mobile app's `metro.config.js`).

**Turborepo** (the `turbo` command) — _the task runner._

- **What:** when you run `pnpm test`, Turborepo runs the tests for **all** apps, in the right
  order, and in parallel where possible.
- **Why:** without it, you'd have to `cd` into each app and run its tests one by one. Turbo
  also **caches** results — if nothing changed in an app, it skips re-running and reuses the
  last result. That makes things fast.
- **Config:** `turbo.json` at the root.

### 4b. The language: TypeScript

**TypeScript** — _JavaScript with type-checking._

- **What:** JavaScript is the language browsers/Node run. TypeScript is JavaScript plus
  "types" — you declare that a variable is a `number` or that a Card has a `maskedPan: string`.
- **Why:** it catches mistakes **before** you run the code. If you try to read a field that
  doesn't exist, or pass a string where a number is needed, the editor underlines it in red
  immediately. For a banking app, catching bugs early is worth a lot.
- The API and the mobile app are both TypeScript. The Agent is Python (which has its own
  type hints).

### 4c. The Bank API (`services/api`)

**Node.js** — _runs JavaScript/TypeScript outside the browser_ (i.e. on a server).

**Fastify** — _the web framework._

- **What:** it turns our code into a web server that answers requests like
  `POST /auth/login` or `GET /cards`.
- **Why Fastify (not Express):** it's fast, modern, and has first-class TypeScript support and
  built-in tools for validating incoming data and auto-generating API documentation.

**Prisma** — _the database toolkit (ORM)._

- **What:** instead of writing raw SQL like `SELECT * FROM cards WHERE ...`, we describe our
  tables in one file (`schema.prisma`) and Prisma gives us clean, type-safe functions like
  `prisma.card.findMany(...)`.
- **Why:** it's safer (no hand-written SQL typos), it's type-checked (the results match our
  TypeScript types), and it manages "migrations" — versioned changes to the database structure.

**jose** — _creates and verifies login tokens (JWTs)._ When you log in, the API hands you a
signed token; every later request shows that token to prove who you are. `jose` does the
signing/checking.

**@fastify/swagger** — _auto-generates interactive API docs_ at `http://localhost:4000/docs`.
Great for testing endpoints by hand.

### 4d. The AI Agent (`services/agent`)

**Python** — chosen because the AI/LLM ecosystem lives mostly in Python.

**FastAPI** — _the web framework for the agent_ (Python's equivalent of Fastify). Turns the
agent's logic into a web server on port 8000, including a WebSocket for streaming chat.

**OpenAI / Anthropic SDKs** — _the connection to the actual AI models_ (GPT-4o from OpenAI, or
Claude from Anthropic). **Important:** these are _optional_. If no API key is set, the agent
falls back to a simple **rule-based** stand-in so the whole thing still runs with zero cost and
no internet. (See `_build_llm` in `app/main.py` — it picks Claude, else OpenAI, else the
stand-in.)

**pytest** + **ruff** — _tests_ and _linter/formatter_ for Python (see 4g).

### 4e. The Mobile App (`apps/mobile`)

**React Native** — _build phone apps using React_ (the popular UI approach). One codebase can
target iPhone and Android.

**Expo** — _the toolkit that makes React Native easy to run._ It handles the messy setup and,
crucially for us, lets the **same app run in a web browser** (`expo start --web`) so you can
develop on a laptop without a phone or emulator.

**React Navigation** — _handles moving between screens_ (the bottom tabs: Home, Cards, Reach
Us, Settings, and the login screen).

**react-native-web** — the bridge that lets React Native components render as normal web
elements in the browser.

### 4f. The databases

**PostgreSQL** ("Postgres") — _the main database._ A rock-solid relational (SQL) database. It
stores customers, accounts, cards, statements — the structured banking data. We use Postgres
because banking data is highly relational (a customer _has_ accounts, which _have_ cards) and
needs to be reliable and consistent.

**MongoDB** ("Mongo") — a second, document-style database included in the setup for future use
(e.g. flexible things like notification logs). It's running but lightly used right now.

### 4g. Code quality & safety tools

These keep the codebase clean and consistent no matter who's typing.

| Tool           | What it does                                     | Why                                                     |
| -------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **ESLint**     | Finds suspicious/buggy code patterns             | Catches mistakes and enforces style rules automatically |
| **Prettier**   | Auto-formats code (spacing, quotes, line breaks) | Nobody argues about formatting; it's automatic          |
| **Vitest**     | Runs the TypeScript tests                        | Proves the API's logic works                            |
| **pytest**     | Runs the Python tests                            | Proves the agent's policy/audit logic works             |
| **ruff**       | Linter + formatter for Python                    | Same idea as ESLint/Prettier, for the agent             |
| **Husky**      | Runs checks automatically _when you commit_      | Bad code can't even get committed                       |
| **commitlint** | Checks your commit _message_ format              | Keeps git history clean & readable (see below)          |

**About commit messages (commitlint):** every commit message must start with a _type_, like
`feat: add login screen` or `fix: correct fee cap`. Valid types: `feat` (new feature), `fix`
(bug fix), `docs` (documentation), `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
`revert`. If you type a message without one (e.g. just "update stuff"), the commit is
**rejected**. This feels annoying at first but makes the project history searchable and lets
tools auto-generate release notes.

**GitHub Actions (CI)** — _the automatic checker in the cloud._ Every time code is pushed,
GitHub re-runs lint + typecheck + tests + build on a fresh machine (see `.github/workflows/
ci.yml`). If anything fails, you see a red ❌ on your pull request. This is the safety net that
keeps the shared `main` branch always working. (We have **CI** = automatic _checking_. We do
**not** yet have **CD** = automatic _deploying_ to a live server — that comes later.)

### 4h. Why Docker?

This is a common "why bother?" question, so here's the honest answer.

Our project needs **five things running at once**: Postgres, Mongo, the API, the Agent, and (in
dev) the app. Each needs a specific version and setup. Installing Postgres, Mongo, Python, and
Node _directly_ on your laptop — at the exact right versions, without clashing with other
projects — is painful and different on every machine ("but it works on _my_ computer!").

**Docker** solves this. A **container** is like a lightweight, disposable mini-computer with
everything pre-installed. We describe each service once (in the `Dockerfile`s under
`infra/docker/`), and `docker-compose.yml` says "run all of these together and connect them."

Then **one command** starts the whole backend, identically on any machine:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

**Why this is great for you as a new joiner:**

- You don't have to install Postgres, Mongo, or Python manually.
- Everyone runs the _exact same_ versions → no "works on my machine" bugs.
- When you're done, the containers throw away cleanly; your laptop stays clean.
- It mirrors how the app would run in production (in the cloud).

You _do_ need **Docker Desktop** installed and running for this. That's the only heavy thing to
install.

---

## 5. How the code is organised inside each app: "Hexagonal Architecture"

Every back-end app (API and Agent) follows the same structure, called **hexagonal
architecture** (also "ports and adapters"). It sounds fancy; the idea is simple.

**The problem it solves:** you want your core business rules to NOT care about _details_ like
"which database" or "which web framework." Those details change; the rules shouldn't have to.

**The solution — three layers:**

```
   domain/        ← the pure rules & data. No database, no web, no libraries. Just logic.
   application/   ← "use cases": orchestrates the rules to do one job (e.g. "freeze a card").
                    It talks to the outside world only through PORTS (interfaces/contracts).
   adapters/      ← the actual outside world, in two kinds:
       inbound/   ← things that CALL us   (the HTTP routes people hit)
       outbound/  ← things WE call        (the database, the AI model, password hashing)
```

**An analogy:** think of a wall socket (a "port"). Your laptop charger (an "adapter") plugs
into it. The wall doesn't care _what_ you plug in; the charger doesn't care _how_ the
electricity is generated. You can swap the charger without rewiring the house.

In our code, the `application` layer says _"I need something that can save a card"_ (a port
called `CardRepository`). Two different **adapters** fulfil that same contract:

- an **in-memory** fake one (used for tests and offline dev — no real database), and
- a **Prisma/Postgres** real one (used when a database is connected).

The magic: switching between them changes **one line** in the "composition root"
(`services/api/src/container.ts`) — and nothing in the business rules changes at all. That's the
whole payoff of this structure.

**Concrete example — the "freeze a card" feature spans these files:**

- `domain/card/card.ts` → what a Card _is_
- `domain/card/card.repository.ts` → the _port_ ("something that can find/save cards")
- `application/card/set-card-frozen.usecase.ts` → the _rule_ ("freeze this card")
- `adapters/inbound/http/card.routes.ts` → the web endpoint `POST /cards/:id/freeze`
- `adapters/outbound/prisma/...` and `.../memory/...` → the two implementations

Once you see this pattern for one feature, every other feature looks the same. That's the point.

---

## 6. The Agent's decision flow (the most important logic)

When a customer sends a chat message, it flows through a **pipeline** of clear steps
(`services/agent/app/application/agent/pipeline.py`):

```
1. injection guard   → block manipulation attempts ("ignore your instructions...")
2. classify intent   → AI decides: is this an ACTION, a question, or unclear?
3. fill slots        → AI extracts details (which card? how much?). Asks if info is missing.
4. policy engine     → PLAIN CODE decides: ALLOW / DENY / ESCALATE-to-human
5. ask confirmation  → even if allowed, we ask "are you sure? (yes/no)"
6. execute the tool  → only now does anything actually happen
7. write audit       → record the decision in the tamper-proof log
8. explain           → tell the customer the result in plain language
```

**The key safety point again:** step 2 and 3 use the AI, but step 4 — the actual decision — is
**ordinary, predictable, fully-tested code** in `domain/conversation/policy.py`. For example,
the fee-reversal rule: a fee over ₹1,000 → send to a human; already used your 2 free reversals
this year → deny; otherwise → allow. No AI judgement in that decision, ever.

**The audit trail** (`domain/conversation/audit.py`) is "hash-chained." Each log entry contains
a fingerprint (hash) of the entry before it, like links in a chain. If someone secretly edits an
old entry, the fingerprints stop matching and the tampering is instantly detectable. This is how
a bank can _prove_ the log wasn't altered.

---

## 7. How the apps talk to each other (a real example)

Let's trace **"I log in and freeze my card":**

1. You type your ID + password in the app's Login screen
   (`apps/mobile/src/screens/LoginScreen.tsx`).
2. The app calls `POST http://localhost:4000/auth/login` (see
   `apps/mobile/src/api/client.ts`). This hits the **API**.
3. The API checks your password (securely hashed) against the **Postgres** database and returns
   a **token** (your temporary ID badge).
4. The Home/Cards screens call `GET /cards` **with that token**. The API returns your real card
   data from Postgres.
5. In the **Reach Us** chat screen, you type "freeze my card." The app calls
   `POST http://localhost:8000/agent/message` — this hits the **Agent** (port 8000, not 4000).
6. The Agent runs the pipeline: understands it, policy says ALLOW, asks "confirm? yes/no."
7. You say "yes." The action runs, an audit record is written, and the agent replies "Done."

Notice the app talks to **two** different back-ends: the **API** (4000) for banking data and the
**Agent** (8000) for chat. Both are configured in `apps/mobile/src/config.ts`.

---

## 8. The database (Postgres), in plain terms

Defined in `services/api/prisma/schema.prisma`. The main tables ("models"):

- **Customer** — a person (name, email, login password hash, KYC status).
- **Account** — a bank account belonging to a customer (savings/current, balance).
- **Card** — a credit/debit card (masked number, status: active/frozen/blocked, limit).
- **Statement** + **StatementLine** — a monthly statement and its individual transactions.
- **ServicingRequest** — a request the customer made (e.g. "reverse this fee") and its status.
- **Notification** — messages shown to the customer.

**One thing that surprises newcomers:** money is stored as a whole number of **paise** (the
smallest unit), not rupees with decimals. So ₹500.00 is stored as `50000`. This avoids the
rounding errors that come with decimal/floating-point math — a must for financial code. The
field names end in `Minor` (e.g. `balanceMinor`) to remind you.

**"Seeding"** means loading demo data so the app isn't empty. `prisma/seed.ts` creates a demo
customer you'll use constantly:

- **Customer ID:** `NB00482193`
- **Password:** `password123`
- (Name: Klaus Crawley)

---

## 9. Configuration: the `.env` file

Programs shouldn't have passwords and secret keys hard-coded. Instead they read them from
**environment variables**, kept in a file called `.env` at the project root. This file is
**private** (it's git-ignored — never committed).

`.env.example` is the **public template** showing what variables exist (with blank/dummy
values). When you join, you copy it: `cp .env.example .env`, then fill in real values.

The important variables:

- `DATABASE_URL` — where Postgres is. If set, the API uses the real database; if empty, it uses
  the in-memory fake data.
- `POSTGRES_HOST_PORT=5433` — Postgres is exposed on **5433** on your laptop (not the usual 5432) to avoid clashing with other projects.
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — optional AI keys. Leave blank and the agent uses its
  free rule-based fallback. Set one to use real GPT-4o or Claude.
- `JWT_SECRET` — the secret used to sign login tokens.

> ⚠️ **Security rule:** never commit `.env`, never paste real keys into chat or screenshots, and
> if a key ever leaks, rotate (regenerate) it.

---

## 10. How to run everything (step by step)

**One-time setup:**

```bash
# 1. Install pnpm if you don't have it
npm install -g pnpm@9

# 2. Install all dependencies for all apps
pnpm install

# 3. Create your .env from the template
cp .env.example .env
```

**Run the back-end (needs Docker Desktop running):**

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

This starts Postgres, Mongo, the API (4000), and the Agent (8000). It also automatically
applies the database structure and loads the demo data.

**Run the customer app in your browser (a second terminal):**

```bash
pnpm --filter @card/mobile exec expo start --web
```

Opens at `http://localhost:8081`. Log in with `NB00482193` / `password123`.

**Handy checks:**

- API docs (try endpoints by hand): `http://localhost:4000/docs`
- API health: `http://localhost:4000/health` · Agent health: `http://localhost:8000/health`

**Run the tests:**

```bash
pnpm test        # all TypeScript tests (via Turborepo)
# and for the agent:
cd services/agent && pytest
```

---

## 11. Jargon cheat-sheet

- **Repo** — a project folder tracked by Git.
- **Monorepo** — one repo holding several apps.
- **Package / dependency** — a reusable library your app installs.
- **Package manager (pnpm)** — the tool that installs those libraries.
- **Workspace** — pnpm's word for "one app inside the monorepo."
- **Framework** — a big library that gives your app its structure (Fastify, FastAPI, React
  Native).
- **API** — a program other programs talk to over the network; also our specific bank back-end.
- **Endpoint / route** — one specific URL the API answers (e.g. `GET /cards`).
- **ORM (Prisma)** — talk to the database using code instead of raw SQL.
- **Migration** — a versioned change to the database's structure.
- **Seed** — load starter/demo data into the database.
- **JWT / token** — a signed "ID badge" proving who you are on each request.
- **Container / Docker** — a disposable mini-computer with a program pre-installed.
- **CI** — automatic checking of your code on GitHub after you push.
- **Lint** — automatic detection of bad/suspicious code.
- **Hexagonal architecture / ports & adapters** — keep core rules separate from database/web
  details so those details are swappable.
- **LLM** — Large Language Model, i.e. the AI (GPT-4o, Claude).
- **Slot** — a piece of info the agent needs to extract (e.g. the fee amount).
- **Audit trail** — the tamper-proof record of every decision.

---

## 12. Where to start reading (suggested path for your first day)

1. `README.md` — the short overview.
2. **This file** — you're here. ✅
3. Follow **one feature end to end** in the API: open `card.routes.ts` →
   `set-card-frozen.usecase.ts` → `card.repository.ts`. Once this "route → use case → port"
   pattern clicks, the whole API makes sense.
4. Read the agent pipeline: `services/agent/app/application/agent/pipeline.py`, then
   `domain/conversation/policy.py`. This is the product's core idea in code.
5. Poke the mobile app: `apps/mobile/src/screens/` (each screen) and `src/api/client.ts` (how it
   calls the back-ends).
6. Run it (Section 10) and click around while watching the terminal logs.

Don't try to understand everything at once. Pick one feature, follow it through all the layers,
and the patterns will repeat everywhere else.

**Welcome aboard — ask questions early and often.** 🚀
