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

## 2026-07-09 — Manual grading (Grade mode)

### Added
- **Candidate grades** (migration `0022`): `candidate_grades` — one row per
  (user, integration, requisition external id, candidate external id) with a
  1–100 `grade`, per-skill / per-category scores in `detail_grades` jsonb,
  and a `note`. Record-only: no ATS writes. RLS: self `for all` + teammate
  SELECT on shared integrations (grades exist for client coordination).
  `set_candidate_grade` RPC — SECURITY DEFINER, gated on
  `can_use_integration`, full-replace upsert (the client merges partial
  edits via `mergeGrade`; jsonb merge can't delete keys), all-empty input
  deletes the row.
- **Deck modes**: the requisition screen now has a mode dropdown
  (`DECK_MODES` registry + `DeckModeSelector`) — **Swipe** (unchanged) and
  **Grade**. Last-used mode persists at `app_prefs.deck_mode`.
- **Grade mode** (`src/features/grades/GradeList.tsx`): scrollable list of
  compact candidate cards (new `variant="compact"` on `CandidateCard` —
  plain View body so it nests in a FlatList) with an inline 1–100
  `GradeControl` per row (tap-to-edit pill → `[−] input [+]`, steppers
  commit immediately, optimistic mutation), a "Swiped" badge, infinite
  scroll, and a Deck order / Highest grade sort toggle. Shows **all**
  candidates including already-swiped (`useDeckCandidates` gained
  `{ includeSwiped }`, folded into the query key) while still honoring the
  funnel filters.
- **Grading detail screen** (`(app)/candidate-grade`, pushed from a Grade
  row): overall grade, a score per skill, fixed Experience/Education
  category scores, and a note — every control auto-saves on commit; "Clear
  grade" deletes the row. Candidate is sourced from the deck query cache
  (`useCachedDeckCandidate`) — no extra proxy round-trip.
- **Candidates tab**: grade chip on match cards (the swiper's grade — works
  in both Mine and Team scopes via `useVisibleGrades`) and a Recent / Grade
  sort toggle (graded first, desc, ungraded keep recency).

### Tests
- Jest: `grade-utils` (clamp/merge/prune/empty matrix), `sort`
  (desc, ungraded-last, stability), `GradeControl` interaction contract —
  86 total.
- RLS: `isolation.test.ts` covers `candidate_grades` + the RPC as an
  outsider; `team-sharing.test.ts` covers teammate grade visibility, own-row
  writes, forged-row rejection, and revocation on leave. Both green locally
  on 0001–0022.

### Deployed (hosted project lbhikadtsmbnzkzetpyb)
- `db push` applied **0013–0022** (hosted was further behind than assumed —
  0012); `functions deploy ats-proxy billing billing-return stripe-webhook`;
  `config push`. Webhook JWT exemption verified (500 signature path, not
  401).

### Fixed
- **billing-return** now issues a **302 redirect** to
  `recruitswipe://billing-return` instead of serving an HTML bounce page:
  the Supabase gateway rewrites HTML from `*.supabase.co` functions to
  `text/plain` with a sandbox CSP (anti-phishing), so the meta-refresh page
  could never render. The in-app browser follows scheme redirects natively.

### Still pending
- Stripe provisioning: products/prices/webhook + the four
  `supabase secrets set` values — needs a test-mode `sk_test_…` key.

## 2026-07-07 — Stripe subscriptions (phase 7)

### Added
- **Real billing** (migration `0021` + two new edge functions). Model:
  Stripe customer + subscription **per user**; the Team plan is
  seat-quantified and bought by the team owner (covers freelance
  partnerships — one partner pays). Plans: `free` (1 connection, no teams),
  `pro` (unlimited connections), `team` (pro + teams up to `seats`).
  Statuses `active`/`trialing`/`past_due` count as entitled.
- **`subscriptions` table** — SELECT own rows + team-owners' rows
  (`shares_team_with`); **no authenticated writes** — the stripe-webhook
  edge function (service role) is the sole writer.
- **Server-side gates**: `has_active_plan` helper; `create_integration` v4
  (2nd connection needs pro/team), `create_team` v2 (needs team plan),
  `invite_to_team` v2 (members + pending invites ≤ owner's seats).
- **Edge functions**: `billing` (JWT-authed; `checkout` → Stripe-hosted
  Checkout session URL with `subscription_data.metadata.user_id`, `portal` →
  Billing Portal URL), `stripe-webhook` (verify_jwt=false; Stripe-Signature
  verified via `constructEventAsync` + SubtleCrypto; handles
  checkout.session.completed / customer.subscription.updated / .deleted),
  and `billing-return` (verify_jwt=false; Stripe redirect URLs must be
  https, so this serves the bounce page to the `recruitswipe://billing-return`
  deep link that closes the in-app browser).
- **App**: `src/features/billing/` — pure `entitlementsFor` (Jest-covered:
  status matrix, plan precedence, seat surfacing, portal reachability after
  cancel) + `useSubscriptions`/`useEntitlements`/`useOpenCheckout`/
  `useOpenPortal` (expo-web-browser `openAuthSessionAsync`, invalidate on
  return + manual Refresh for the webhook race). Subscriptions screen
  replaces the stub (plan card, renew date, upgrade buttons with team-seat
  picker, Manage billing). UI gates: Connect screen (2nd connection →
  upgrade prompt), team screen (create team → upgrade prompt), settings tab
  shows the live plan.
- RLS team-sharing test seeds a team subscription (gates are live in the
  suite); both RLS suites green against 0016–0021.

### Setup required before billing works (user)
1. Stripe dashboard: create Pro (monthly, per-user) and Team (monthly,
   per-seat) prices.
2. `npx supabase secrets set STRIPE_SECRET_KEY=sk_… STRIPE_WEBHOOK_SECRET=whsec_… STRIPE_PRICE_PRO=price_… STRIPE_PRICE_TEAM=price_…`
3. Register the webhook endpoint
   `https://lbhikadtsmbnzkzetpyb.supabase.co/functions/v1/stripe-webhook`
   for `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Deploy: `npx supabase db push` (0016–0021),
   `npx supabase functions deploy ats-proxy billing billing-return stripe-webhook`,
   `npx supabase config push` (webhook JWT exemptions).

## 2026-07-07 — Team UX (phase 6)

### Added
- **Recruit Team screen is real** (`/settings/team` replaces the stub):
  create teams (works for org teams and 2-person freelance partnerships),
  invite by email (pending invites listed with revoke; existing accounts
  join instantly), member list with roles, remove member (role-gated),
  leave / delete team with confirmations. `claim_team_invites` fires once
  per session from the app layout (alongside push registration) so
  invited-before-signup accounts join automatically.
- **`src/features/teams/queries.ts`** — teams/members/invites queries +
  create/invite/revoke/leave/remove/delete mutations,
  `useSetIntegrationSharedTeam`, `useProfileNames` (teammate display-name
  lookup), `claimTeamInvites`.
- **Connections tab**: team-shared rows surface automatically via RLS with
  a "Shared by {name}" pill (your own shared connections show "Shared");
  detail screens work end-to-end for teammates.
- **Integration detail**: owner-only "Share this connection with a team"
  row — the confirm dialog states that teammates act through YOUR
  credentials and ATS actions attribute to your account; unshare warns
  about immediate access loss.
- **Candidates tab**: Mine / Team scope toggle (shown once you're in a
  team); team scope adds teammates' saves with "Saved by {name}".
- **Activity screen**: teammate swipes attributed ("by {name}"); the
  retry button stays own-swipes-only.

### Changed
- **Swipe-action settings are per-member** (app side of migration 0020):
  upsert targets `(integration_id, direction, user_id)`;
  `actionsForDirection(rows, direction, userId)` resolves inheritance —
  your row wins, else the owner's team default (Jest-covered). The settings
  screen labels shared connections ("editing your personal overrides…").

## 2026-07-07 — Teams: schema, invites, sharing + RLS rewrite (phase 5)

### Added
- **Teams** (migration `0018`): `teams` / `team_members`
  (owner|admin|member) / `team_invites` (by email, lowercased; pending →
  accepted|revoked; partial-unique per live invite). One model covers org
  recruitment teams AND freelance partner pairs (a partnership is a
  2-person team). STABLE SECURITY DEFINER membership helpers
  (`is_team_member`, `is_team_admin`, `shares_team_with`) power all
  policies without RLS recursion. RPCs: `create_team`, `invite_to_team`
  (instant-add when the email already has an account), **`claim_team_invites`**
  (called once per session — covers invite-before-signup), `leave_team`
  (last owner must transfer/delete), `remove_team_member` (role-gated).
- **Connection sharing** (migration `0019`):
  `integrations.shared_team_id` (owner picks at most one team; null =
  private). Additive SELECT policies — teammates read the shared
  integration, its requisitions/candidates caches, each other's `swipes`
  (shared shortlist), and profile display names; every write policy stays
  owner/author-only. **`read_integration_credentials` v2** decrypts for
  teammates of the shared team (plaintext still never leaves the edge
  function; zero ats-proxy code changes needed — its lookups run under the
  caller's JWT). `record_swipe` v5 / `set_notification_topic` v2 /
  `set_requisition_filters` v2 accept teammates via a shared
  `can_use_integration` predicate. `list_activity_for_integration` v2
  (return type changed → drop/recreate) includes teammate swipes +
  `swiper_user_id`/`swiper_display_name`. ⚠️ Teammate ATS writes attribute
  to the owner's ATS identity — surfaced in the share-toggle UI copy
  (phase 6).
- **Per-member swipe-action settings** (migration `0020`):
  `integration_settings.user_id` (backfilled from the integration owner,
  NOT NULL; unique key now `(integration_id, direction, user_id)`). The
  owner's rows are the team defaults; members read them and save personal
  overrides. RLS: full control of your own rows on any usable integration +
  SELECT of the owner's rows on shared ones. ⚠️ App upsert conflict target
  changes in phase 6.
- **`supabase/tests/rls/team-sharing.test.ts`** — full lifecycle against a
  local stack: teammate reads (and NOT the owner's unshared integration),
  credential decryption (teammate yes / outsider no / unshared no),
  teammate record_swipe visible to the owner, activity attribution, forged
  settings rows rejected, pending-invite claim by a brand-new account, and
  total revocation after `leave_team`. CI's rls job now runs the whole
  `supabase/tests/rls/` directory. **Both suites green locally.**

### Fixed
- `notification_topics` unique key lacked `user_id` — two teammates
  subscribing to the same requisition would have collided. Key is now
  `(user_id, integration_id, requisition_external_id)` (0019), and
  `set_notification_topic`'s upsert target updated with it.
- `supabase/seed.sql` seeds `integration_settings.user_id`.

## 2026-07-07 — Dev-client migration (phase 4)

### Added
- **expo-dev-client** (+ expo-web-browser, ahead of the Stripe checkout
  flow). EAS project created and linked: `@jdfan/recruit-swipe`
  (`extra.eas.projectId` now in app.json). `expo-notifications` config
  plugin added (default Android channel). Push-token registration needed no
  code change — `register.ts` already reads the EAS projectId and no-ops in
  Expo Go.
- First Android development build kicked off on EAS
  (`eas build --profile development --platform android`).

### Remaining (user)
- iOS dev build (`eas build --profile development --platform ios`) — needs
  the Apple Developer account sign-in.
- Push credentials (`eas credentials`): iOS APNs key (EAS-managed);
  Android `google-services.json` + FCM v1 service account for real
  delivery.
- Install the dev build on-device, run `npx expo start --dev-client`.

## 2026-07-07 — Candidate preference filters (phase 3)

### Added
- **Dating-app-style candidate filters**: skills (any/all), years of
  experience (min/max), locations (substring any-of), education keywords,
  and has-resume. **Missing-data rule:** a candidate missing a filtered
  field passes unless that filter's *strict* toggle ("also exclude
  candidates missing this info") is on — most sources send partial profiles,
  so filters narrow on evidence rather than punish absence. has-resume is
  inherently strict. Pure logic in `src/features/filters/predicate.ts`
  (`candidatePassesFilters`, key-wise `effectiveFilters` merge where an
  explicitly-emptied per-req section clears the global one, stable
  `filtersKey`, `activeFilterCount`) — table-driven Jest suite.
- **Two scopes**: global defaults in
  `recruiter_profiles.app_prefs.candidate_filters` (Settings → Candidate
  filters, new row + `/settings/candidate-filters`), per-requisition
  overrides in the new **`requisition_filters`** table (migration `0017`,
  RLS self-scoped, `set_requisition_filters` SECURITY DEFINER upsert RPC —
  null filters deletes the override). Reachable from the deck's funnel
  header icon (badged when active) and a funnel affordance on each
  requisition row; editor seeds from global defaults, "Reset to my global
  defaults" restores inheritance.
- **UI primitives** `src/components/filter-controls.tsx`
  (`ChipMultiSelectRow`, `MinMaxStepperRow`, `StrictToggleRow`) + shared
  `FilterEditor` (draft/dirty/Save, same pattern as swipe-action settings).

### Changed
- **Deck query** applies filters per page after the already-swiped filter;
  the query key includes `filtersKey` so edits mount a fresh deck (top index
  resets); surfaces `filteredOutCount`. **Runaway-paging guard**: with
  active filters, after 5 consecutive fully-hidden pages the deck stops
  auto-paging and offers "Edit filters" instead of walking the provider's
  whole pipeline; the all-caught-up card reports how many candidates the
  filters hid. Matching skill-filter values render as accent chips on the
  card (`highlightSkills`).
- RLS isolation test now covers `requisition_filters` + the
  `set_requisition_filters` ownership check.

### Pending deploy (user)
- `npx supabase db push` (0017 — after 0016).

## 2026-07-07 — Information-first candidate card + profile (phase 2)

### Added
- **Shared `CandidateCard`** (`src/features/swipes/CandidateCard.tsx`),
  extracted from the deck screen and redesigned info-first: 48px identity
  circle (initials monogram; a provider photo renders *inside* the circle,
  never as a hero image), name + headline, location/experience meta row,
  skill chips (cap 8 + "+N more", with a `highlightSkills` prop that accents
  matches — wired to the skill filter in phase 3), up to 3 recent roles with
  date ranges, up to 2 education lines. Sections self-omit when a provider
  is sparse. Card body scrolls (gesture-handler ScrollView).
- RNTL suite `candidate-card.test.tsx` (render/omit, caps, highlight); Jest
  CSS stub (`jest.style-stub.js`) so component tests can import the theme.

### Changed
- **SwipeableCard** pan constrained to the horizontal axis
  (`activeOffsetX ±15` / `failOffsetY ±15`) so the card body can scroll;
  gesture up-swipe (Boost) only fires when content doesn't overflow — the
  Boost button remains the reliable path. Card now fills the deck area
  (`flex: 1`) instead of being sized by the old hero photo.
- **Candidate profile screen** hero demoted to a 64px initials-first circle;
  new Experience (full timeline incl. summaries) and Education sections
  between Details and Skills; local `initials()` replaced by the shared
  helper in `candidate-utils` (which also gains `formatMonthYear` /
  `formatDateRange`).

## 2026-07-07 — Structured candidate history (info-first cards, phase 1)

### Added
- **`Candidate.experience` / `Candidate.education`** — the normalized model
  (`src/ats/types.ts`) gains employment history (`ExperienceEntry[]`: title,
  company, start/end, summary; `end` absent = current role) and education
  (`EducationEntry[]`: school, degree, field, dates), both most-recent-first.
  Groundwork for the information-first card redesign (photos are rare and
  bias-prone; recruiting signal lives in the history).
- **`src/ats/candidate-utils.ts`** — `deriveYearsExperience` (timeline span,
  clamped [0,50]), `parseLooseDate`, `sortMostRecentFirst`, `currentRole`,
  `initials`. Jest-covered (`src/ats/__tests__/candidate-utils.test.ts`).
  Mirrored for the edge runtime in
  `supabase/functions/_shared/candidate-derive.ts` (single home for the Norm
  entry shapes the Deno clients import).
- **Migration `0016_candidate_profile_fields.sql`** — `candidates.experience`
  / `candidates.education` jsonb + **`record_swipe` v4** (two new defaulted
  params; the 17-arg v3 signature is dropped first to avoid an ambiguous
  overload, grants re-issued).

### Changed
- **Greenhouse Deno client** maps Harvest `employments[]`/`educations[]` and
  derives `yearsExperience` from the timeline (no provider sends it
  explicitly — previously it was always empty).
- **Workable Deno client** now enriches each per-job list row with a pooled
  candidate-detail fetch (`experience_entries`/`education_entries`/parsed
  `skills`, unioned with tags), concurrency 3 against Workable's ~5 req/s
  throttle, degrading to summary fields per-candidate on failure. Note: this
  also raises `detect-new-candidates` scan cost for Workable (detail fetches
  it doesn't need) — acceptable while scans are manual, worth a lean mode
  when scheduling lands. ⚠️ detail response shape (wrapped vs bare) handled
  defensively; confirm against a sandbox.
- **Mock adapter** regenerated: seeded 2–4-role experience timelines (~60%
  currently employed) + 1–2 education entries; `yearsExperience` now derived;
  skills 3–6; ~40% carry a resume link (exercises the coming has-resume
  filter); **photos only on every 5th candidate** — initials become the
  common case, matching real providers.
- Contract tests: experience/education shape assertions (string-valued keys,
  no leakage), Greenhouse fixture extended, Workable detail fixture + route +
  degrade-on-500 test. Ashby/Recruitee structured history deferred pending
  field verification; SmartRecruiters/Lever noted as deferred in-plan.

### Pending deploy (user)
- `npx supabase db push` (0016) then `npx supabase functions deploy ats-proxy`
  — the app passes the two new `record_swipe` params, so push the migration
  before running the app against this branch.

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
