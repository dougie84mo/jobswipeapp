# Changelog

All notable changes to Recruit Swipe. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the app is pre-release
(`0.1.0`), so entries are grouped by date rather than version. This is the
running log going forward — detailed session write-ups still live in `docs/`,
and the per-adapter credential guide is `docs/ats-credentials-guide.md`.

Adapter coverage at a glance: **10 live** (mock, greenhouse, ashby, lever,
workable, recruitee, teamtailor, manatal, bamboohr, smartrecruiters, jazzhr) ·
**2 experimental** (icims, workday — read scaffolds, `ready:false`, unverified
pending partner sandbox) · **2 partner-delegated** (indeed, ziprecruiter).

## 2026-07-06 — Provider-access re-verification + outreach packets

### Changed
- **`docs/ats-credentials-guide.md` updated from a full 14-provider access
  re-verification** (all channel URLs fetched 2026-07-06). Headline finding:
  🚨 **Greenhouse Harvest v1/v2 are removed 2026-08-31 and v3 switches auth
  from Basic to OAuth client-credentials** — the live `_shared/greenhouse.ts`
  client must be migrated before then (same Vault/extras pattern as
  SmartRecruiters). Other corrections: SmartRecruiters moved out of the
  free-sandbox tier (no self-serve sandbox exists); BambooHR test accounts go
  through a request form (1–2 business days, max 2 per developer) and its ATS
  API documents an Update Applicant Status endpoint (reject may be
  promotable); Workable tokens now carry scopes + mandatory expiry (≤2y);
  Lever's sandbox registration is browser-only and needs a hosted square
  logo; Teamtailor partner intake is techpartnerships@teamtailor.com.
- Source-of-record pointer for outreach status now `prompts/outreach/_TRACKER.md`
  (gitignored), with execution-ready per-provider packets beside it — one per
  ATS plus an Indeed/ZipRecruiter handoff brief for the delegated
  partner-outreach agent.

## 2026-07-05 — Settings becomes a navigation hub

### Added
- **`/settings/preferences`** — push-notification + swipe-gesture switches
  moved off the tab onto their own page.
- **`/settings/account`** — account credentials page: email + change
  password (via `updatePassword`; the earlier flagged follow-up). Name/org
  stays on `/settings/profile`.
- **`/settings/subscriptions`** (stub) — "Free — early access" plan card +
  billing-coming-soon copy. Clean extension point; billing itself stays out
  of scope.
- **`/settings/team`** (stub) — Recruit Team teaser (invites, shared
  sources, requisition assignment). Multi-recruiter features stay out of
  scope; this is the landing spot.
- `src/components/settings-list.tsx` — `SettingsGroup` / `NavRow` /
  `SwitchRow` / `RowDivider` extracted from the Settings tab so all
  settings pages share the same grouped-list primitives.

### Changed
- **Settings tab is now a pure navigation list**: Account → Profile /
  Account settings / Recruit Team; Sources → Connect a source; App →
  Preferences / Subscriptions; Sign out. Inline switches moved to the
  Preferences page.

## 2026-07-04 — Candidates tab + Settings restructure

### Added
- **Candidate profile screen** (`(app)/candidate/[swipeId].tsx`) — pushed
  when tapping a match on the Candidates tab (previously routed to the
  integration's Activity list). Shows the cached candidate snapshot (photo,
  headline, location, experience, skills, resume link) plus the swipe
  outcome (per-action status via `describeAction`, now shared in
  `features/swipes/action-labels.ts`) and a link to the source's Activity.
  Backed by `useMatch(swipeId)`.
- Stack headers now use `headerBackButtonDisplayMode: 'minimal'` — kills
  the literal "(tabs)" back-button label on detail screens.
- **Candidates tab** — fourth tab: the recruiter's shortlist. Lists every
  positive swipe (right = Saved, up = Boosted) across all integrations,
  newest first, via a new `useMatches` hook (`src/features/swipes/matches.ts`
  — swipes joined to the candidate/requisition caches through PostgREST
  embeds, RLS-scoped). Cards show avatar/initials, headline, requisition,
  source, and a Saved/Boosted pill; tapping opens that integration's
  Activity screen. `record_swipe` success now invalidates the matches query.
- **`/settings/profile`** (pushed) — display name / org editing moved off
  the tab into its own screen.

### Changed
- **Profile tab → Settings tab** — rebuilt as a grouped options list
  (`NavRow` / `SwitchRow` primitives) so future options are one row each:
  Account → Profile, Sources → Connect a source, Preferences → push +
  gesture switches, Sign out. Connections button on the tab is unchanged.

## 2026-07-04 — Auth hardening: code-based emails, password reset, Expo Go fix

### Added
- **Forgot-password flow** (`src/app/reset-password.tsx`, linked from sign-in):
  email → 6-digit recovery code → new password, fully in-app via
  `verifyOtp(type: 'recovery')` + `updateUser`. No deep link involved, so it
  works in Expo Go and any future build alike.
- **In-app sign-up confirmation** — email confirmations are now ON for the
  hosted project; the sign-up screen gained a verify step (6-digit code +
  resend via `auth.resend`) instead of the old "check your inbox, then sign
  in" link flow that dead-ended in a browser.
- **Auth email templates versioned in-repo** (`supabase/templates/*.html`,
  wired in `config.toml`, deployed with `npx supabase config push`). All three
  templates (magic link / recovery / confirmation) are code-based
  (`{{ .Token }}`) — never link-based, since the app has no deep linking.

### Fixed
- **"Resend code" emailed a magic link instead of a 6-digit code.** Root
  cause: Supabase's default Magic Link template uses `{{ .ConfirmationURL }}`,
  and `signInWithOtp` on an *existing* user sends that template (a new user
  got the signup template — which is why the first email differed from the
  resend). All templates now carry `{{ .Token }}`; remote `otp_length` was
  also 8 while the app's UI expected 6 — pinned to 6.
- **Red-box error on first load in Expo Go** — importing `expo-notifications`
  at module scope fired its push-token auto-registration side effect, which
  red-boxes in Expo Go (remote push unsupported since SDK 53). `register.ts`
  now bails in Expo Go before a deferred `await import('expo-notifications')`.
- **OTP fallback no longer creates accounts** — `sendEmailOtp` was
  `shouldCreateUser: true`, so any typo'd email silently became a phantom
  passwordless account, bypassing sign-up. Now `false`, with a friendly
  "no account found — sign up first" alert.

### Changed
- Hosted auth config now managed from `supabase/config.toml` (was: dashboard
  drift). Pinned: `minimum_password_length = 8` (matches the client check;
  server default was 6), `otp_length = 6`, `otp_expiry = 3600`,
  email `max_frequency = "1m0s"`, `enable_confirmations = true`, TOTP MFA
  left enabled to match the hosted default.

## 2026-07-01 — Full adapter audit + status snapshot

### Added
- `docs/next-session-kickoff.md` — a paste-ready kickoff prompt + reference for
  the next phase: connecting real ATS APIs. Priority order of self-serve
  sandboxes (BambooHR → SmartRecruiters → Lever), what creds each needs, the
  blocked/delegated set, and the per-provider verification loop.
- `docs/adapter-status.md` — single-source status snapshot from a full codebase
  audit: the adapter matrix across all layers, per-provider sandbox unknowns, the
  architecture cheat-sheet, and what's left. The "resume here" doc.

### Notes
- Audit confirmed **nothing is missing or orphaned**: 15 providers consistent
  across adapter/registry/types/connect/proxy/dispatch; 11 connectable ==
  11 `ready:true`; iCIMS/Workday `ready:false` scaffolds; Indeed/ZipRecruiter
  delegated shells. No adapter is yet verified against a real provider API
  (contract tests are synthetic) — sandbox verification is the top open item.

## 2026-06-30 — JazzHR; iCIMS/Workday researched & deferred

### Added
- **JazzHR adapter** — live, **read-only** (same posture as Manatal). `apikey`
  query-param auth; reads jobs (open only) + applicants per job with `/page/{n}`
  pagination. Writes deferred (v1 write format unverified; no workflow-step list
  endpoint; no free sandbox). (`b1c7710`)

- **iCIMS** and **Workday** — **experimental read scaffolds** built (at explicit
  request) but kept **`ready:false`** (not connectable). Both are partner-gated
  with undocumented read shapes, so the clients are best-effort guesses whose
  contract tests validate normalization against *authored* fixtures only — they
  do **not** prove the shapes match real providers. iCIMS: client-credentials +
  search-then-fetch with defensive field mapping. Workday: `GET /jobRequisitions`
  + a placeholder client-credentials token (real auth is likely 3-legged) + a
  guessed candidates endpoint. Added a shared `fetchClientCredentialsToken()`
  OAuth helper. Must be verified against a partner sandbox before going live.
  (`74b8596`)

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
