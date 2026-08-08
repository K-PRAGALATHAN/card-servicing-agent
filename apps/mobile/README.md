# apps/mobile — Customer Mobile App (Expo / React Native)

The customer app: **Home**, **Cards**, **Reach Us** (AI servicing assistant), and
**Settings** — wired to the Phase 1 API and the Phase 2 agent. Styled to the approved
wireframe (see `docs/wireframes.md`). Part of
[Phase 3](../../docs/phase-3-customer-mobile-app.md).

## Run it

1. Start the backend so the app has data + the agent:
   ```bash
   docker compose -f infra/docker/docker-compose.yml up --build
   ```
2. Install workspace deps (from the repo root): `pnpm install`
3. Start Expo:
   ```bash
   pnpm --filter @card/mobile start
   ```
4. Open it:
   - **Physical phone:** install **Expo Go**, scan the QR. The app auto-detects your
     machine's LAN IP (via Expo) to reach the API/agent — no config needed.
   - **Android emulator:** press `a`. (Emulator reaches the host at `10.0.2.2`; set
     `API_BASE`/`AGENT_BASE` in `src/config.ts` if needed.)
   - **iOS simulator:** press `i`.

Sign in with the seeded demo customer: **`NB00482193` / `password123`** (pre-filled).

## Structure

```
App.tsx                      entry (SafeArea + Auth + navigation)
src/
  config.ts                  API/agent base URLs (auto LAN host via Expo)
  theme.ts                   design tokens (navy + serious danger red)
  api/                       typed client + response types
  auth/AuthContext.tsx       login + token in SecureStore
  navigation/                auth stack + bottom tabs
  components/                Button, Card, Row, CreditCard
  screens/                   Login, Home, Cards, ReachUs, Settings
  hooks/useLoad.ts           minimal data-fetching hook
```

## Notes

- **Reach Us** posts to the agent's `/agent/message`; replies are rendered by kind
  (confirm / escalate get distinct styling).
- Verified via `pnpm --filter @card/mobile typecheck`. Running needs a device or
  emulator (Expo).
