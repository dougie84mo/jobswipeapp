# Recruit Swipe — Hardening + P4/P5 Session (June 2026)

Summary of a large body of work landed on `main`: reliability/observability,
the first test suites + CI gates, two new ATS adapters, the app-side test
harness, a backlog of audit fixes, and the per-requisition push-topics feature.
Use this as the map when verifying / testing.

## How it was verified
- **Edge functions (Deno):** `deno test` (24 tests), `deno fmt --check`, `deno lint`
  — run from `supabase/functions/`. Deno installed locally at `~/.deno/bin`.
- **App (Expo/RN):** `npm run typecheck`, `npm run lint` (ESLint), `npm test`
  (Jest, 3 tests).
- **DB / RLS:** `supabase start` (local stack) + `supabase db reset` to apply all
  migrations + seed, then the RLS isolation suite (`supabase/tests/rls/`).
- **CI:** `.github/workflows/ci.yml` — app job (lint/typecheck/test), edge job
  (fmt/lint/test, now a real gate), and an `rls` job that boots a stack.

## What landed

### P1 — reliability & observability
- `supabase/functions/_shared/http.ts` — shared transport: `fetchWithBackoff`
  (429/Retry-After, per-attempt `AbortSignal.timeout`), `callGet`/`callWrite`,
  `HttpError` (PII-free — never carries response bodies), `authHeaderBasic/Bearer`,
  `pooledMap` (bounded fan-out), centralized `MAX_*`/`PER_PAGE` defaults. All five
  original clients delegate to it.
- Structured per-request logging in `ats-proxy` (one JSON line; no creds/PII),
  including pre-dispatch validation failures.
- Real pagination cursors threaded client → proxy → facade → deck
  (`useInfiniteQuery`); auto-walk remains the default.

### P2 — tests + CI
- Adapter **contract tests** + fixtures for the 5 live clients
  (`_shared/__tests__/contract.test.ts`) — the gate every new client must pass.
- **RLS isolation test** (`supabase/tests/rls/isolation.test.ts`) — user B cannot
  read/write user A across all user-scoped tables (now 6, incl. notification_topics).
- `supabase/functions/deno.json` (singleQuote, lint excludes) — the edge CI job
  was previously red without it.
- Fixed `supabase/seed.sql` (was using the dropped `credentials_encrypted` column
  — it broke `supabase start` entirely).
- CI made the edge `deno test` a real gate + added the `rls` job.

### P4 — new ATS adapters
- **Teamtailor** (`_shared/teamtailor.ts`) — JSON:API; reads + advance stage +
  reject. Tags/notes/messaging deferred (`capabilities()` reports false).
  ⚠️ NA region base (`api.na.teamtailor.com/v1`) not yet handled.
- **Manatal** (`_shared/manatal.ts`) — DRF; **reads-only** (writes deferred until
  the `stage` vs `job_pipeline_stage` PATCH schema is confirmed against a sandbox).

### P5a — app test harness
- `jest-expo` + RNTL + `react-test-renderer`, `jest.config.js` (scoped to `src/`),
  `npm test` in CI. First test covers the swipe-action retry path.

### Backlog quick wins
- Committed `package-lock.json` (CI `npm ci` was broken without it).
- ESLint flat config (`eslint.config.js`).
- Fetch timeout + proxy validation logging.
- Provider display names from the adapter registry (Teamtailor/Manatal no longer
  show slugs); removed dead `react-native-deck-swiper`.
- Migration 0013: `swipes(user_id, created_at desc)` index + `record_swipe`
  returns the existing id on a duplicate.

### High-impact fixes
- **N+1 fan-out** bounded via `pooledMap` (Greenhouse/Ashby/Manatal).
- **Swipe-index rollback** on `record_swipe` failure (decisions no longer dropped).
- **Deck accessibility** (card announces the candidate; labeled buttons).
- **App error boundary** around the `(app)` stack.

### P5b — per-requisition push topics
- Migration 0014: `notification_topics` + `set_notification_topic` RPC; a bell
  toggle on each requisition row.
- Migration 0015: `notification_seen` (seen-set) + `last_scanned_at` baseline +
  `read_pending_notification_scans()` (service-role credential read).
- `_shared/dispatch.ts` (`listCandidatesForProvider`) + `detect-new-candidates`
  edge function: baseline on first scan, alert on the delta via `send-push`.

## Known NOT verified (needs external access)
- **Live ATS reads/writes** — contract tests use synthetic fixtures; no provider
  sandbox creds yet. Teamtailor reject + Manatal writes need a sandbox to confirm.
- **Push delivery** — needs a dev client (Expo Go can't issue Expo push tokens).
- **detect-new-candidates scheduling** — needs pg_cron + pg_net (or external
  scheduler) wired on the hosted project; the function itself isn't yet deployed.

## Outreach + planning artifacts (in `prompts/`, gitignored — local only)
- `ATS_API_ACCESS_OUTREACH_PLAN.md` — access tiers + per-provider URLs (Appendix A).
- `ats_access_tracker.csv` — all 14 providers.
- `outreach_email_templates.md` — tier-keyed templates.
- `UPGRADES_BACKLOG.md` — remaining audit findings (most quick/high-impact done).

## Recommended next steps
1. **Sandbox access** (the unlock): BambooHR has a **free** dev sandbox — best next
   adapter (build + verify writes immediately). Also Lever + SmartRecruiters
   sandboxes are free. Start iCIMS/Workday partner apps early (long lead).
2. **Finish P4 long tail** + wire `send_template` (Teamtailor/Greenhouse) + fold
   `on_behalf_of` into `extras`.
3. **P3 Merge.dev** routing tier (account being provisioned).
4. Smaller: Teamtailor NA-region base URL; broader accessibility sweep; the
   remaining `UPGRADES_BACKLOG.md` items.
