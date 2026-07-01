# Changelog

All notable changes to Recruit Swipe. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the app is pre-release
(`0.1.0`), so entries are grouped by date rather than version. This is the
running log going forward — detailed session write-ups still live in `docs/`,
and the per-adapter credential guide is `docs/ats-credentials-guide.md`.

Adapter coverage at a glance: **10 live** (mock, greenhouse, ashby, lever,
workable, recruitee, teamtailor, manatal, bamboohr, smartrecruiters, jazzhr) ·
**2 shells** (icims, workday — partner-gated, deferred) · **2 partner-delegated**
(indeed, ziprecruiter).

## 2026-06-30 — JazzHR; iCIMS/Workday researched & deferred

### Added
- **JazzHR adapter** — live, **read-only** (same posture as Manatal). `apikey`
  query-param auth; reads jobs (open only) + applicants per job with `/page/{n}`
  pagination. Writes deferred (v1 write format unverified; no workflow-step list
  endpoint; no free sandbox). (`b1c7710`)

### Changed
- **iCIMS** and **Workday** are the last two shells and are **deliberately
  deferred, not built blind.** Both are partner-gated (no verification path) and
  their read shapes aren't publicly documented — iCIMS is POST search-then-fetch
  with undocumented object fields; Workday's recruiting API points to 3-legged
  Authorization Code auth + an undocumented candidate endpoint. Building them
  speculatively would produce self-referential tests that validate nothing.
  Captured the exact auth models + build blockers in their shell headers and
  `docs/ats-credentials-guide.md` (Tier 4) so they're a fast follow once partner
  sandbox access lands. iCIMS will reuse the SmartRecruiters client-credentials
  pattern (needs a 3rd connect field); Workday needs a real OAuth redirect flow.

## 2026-06-26 — BambooHR + SmartRecruiters (first OAuth)
See `docs/2026-06-adapters-oauth-session.md`.

### Added
- **SmartRecruiters adapter** — reads + advance stage + reject. The project's
  **first OAuth provider**: client-credentials (server-to-server, no app
  redirect). `client_secret` in Vault, `client_id` in `extras.client_id`,
  reusing the existing two-field connect form. Establishes the pattern for
  future OAuth adapters. (`22dda21`)
- **BambooHR adapter** — reads + advance stage (status change) + add note
  (comment). Basic auth + company subdomain; candidate externalId is the
  application id. (`3fc1dd7`)
- **Per-adapter credentials acquisition guide** (`docs/ats-credentials-guide.md`)
  — what to collect, access model, and where to get it, per provider. (`705770c`)

### Changed
- BambooHR capabilities trimmed to match the real API: reject and apply-tag are
  **off** (no dedicated reject endpoint; no tag API). (`3fc1dd7`)

### Fixed
- Deno 2.8.3 / TypeScript 6.0.3 raised TS7022 on un-annotated generic
  paginated-helper call sites; annotated the bindings in six clients (ashby,
  greenhouse, lever, manatal, recruitee, workable). No runtime change; restores
  a clean local `deno check`. CI was unaffected (runs `--no-check`). (`7f104ad`)

## 2026-06-14 — Hardening pt.2: adapters, app tests, notifications
See `docs/2026-06-hardening-session.md`.

### Added
- **Teamtailor adapter** (reads + advance + reject) and **Manatal adapter**
  (reads-only). (`9b67be1`, `92b9fea`)
- **App test harness** — `jest-expo` + RNTL, `npm test` in CI; first test covers
  the swipe-action retry path. (`9f82700`)
- **Per-requisition push topics** — `notification_topics` + opt-in bell toggle
  (migration 0014) and the `detect-new-candidates` edge function that baselines
  then alerts on the delta via `send-push` (migration 0015). (`55bfa5c`,
  `4eb80e1`)
- App-wide error boundary around the `(app)` stack; swipe-deck accessibility.
  (`c007384`, `7dd3b8b`)

### Changed
- Provider display names now come from the adapter registry; dropped the dead
  `react-native-deck-swiper` dep. (`2442b97`)
- Migration 0013: `swipes(user_id, created_at)` index + `record_swipe` returns
  the existing id on duplicate. (`7357e74`)

### Fixed
- Roll the swipe card back when persisting a swipe fails (decisions no longer
  silently dropped). (`013d467`)
- Bound the N+1 candidate fan-out concurrency (`pooledMap`). (`1df389b`)
- Fetch timeout + proxy pre-dispatch failure logging. (`3379bd0`)

## 2026-06-13 — Hardening pt.1: reliability + first tests + CI
### Added
- **Adapter contract tests + fixtures** for the live clients — the gate every
  new client must pass. (`e4b25d2`)
- **RLS cross-user isolation tests**; CI `rls` job boots a Supabase stack, and
  the edge `deno test` is now a real gate. (`401a8c7`, `bb9df8d`)
- ESLint flat config. (`3615481`)

### Changed
- Extracted `_shared/http.ts` (uniform retry/rate-limit/timeout, PII-free
  errors); routed all five clients through it. (`046a8cb`, `c6c9ccf`)
- Structured per-request logging in `ats-proxy`; real pagination cursors threaded
  end-to-end. (`aeb6db4`, `c8d8556`)

## 2026-05-31 — Capability shells
### Added
- Registered 7 capability-only ATS shells (smartrecruiters, workday, bamboohr,
  jazzhr, teamtailor, icims, manatal) + Connect metadata, so `getAdapter`
  resolves and the UI can surface them as "coming soon". (`11e1481`)

## 2026-05-26 — Adapters 3–5, gestures, push scaffold
### Added
- **Lever**, **Workable**, and **Recruitee** adapters end-to-end. (`b31e1d8`,
  `599a587`, `02578c0`)
- Gesture-based swiping (toggleable in Profile). (`9b4bb8d`)
- Push-notification scaffold (token registration, `send-push`). (`9956a23`)
- `SourceKind` taxonomy (`ats` | `job_board`) + Indeed / ZipRecruiter
  scaffolding. (`7397d32`)

### Changed
- Pagination + 429 back-off in the ats-proxy Deno clients. (`7200979`)
- Retry failed swipe actions from the Activity screen. (`be6a5e2`)

## 2026-05-25 — Foundations
### Added
- **Greenhouse** (read path + writes with `on_behalf_of_user_id`) and **Ashby**
  adapters via the `ats-proxy` edge function. (`815ac63`, `359b59a`, `a9b371f`)
- Credential encryption with Supabase Vault. (`30cf0b7`)
- Configurable swipe actions + per-swipe execution; activity/history screen.
  (`022d54f`, `93608d5`)
- Swipe deck with mock candidates + Postgres persistence; requisition picker;
  integrations list + connect flow; mock adapter + registry + client facade.
- Bottom-tab navigation (Home / Connections / Profile); profile + settings.
- Email password + OTP-code auth (replaced magic-link).

### Changed
- Pinned Expo SDK to 54 to match the App Store / Play Store Expo Go build.

## 2026-05-24 — Project scaffold
### Added
- Scaffolded the Expo + Supabase app; archived the legacy web app under
  `legacy/` (read-only reference). Auth gate, session provider, protected route
  group. (`da5bd9a`, `3ff5e50`)

## 2025-03-12 — Legacy
- Initial commit of the original JobActual web app — now `legacy/`, kept as
  read-only reference until the Expo rebuild reaches parity. (`0f8fd97`)
