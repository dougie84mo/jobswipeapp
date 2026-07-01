# Recruit Swipe — Adapter & Project Status (2026-07-01)

Single-source snapshot of where every ATS adapter stands and what's left. Built
from a full codebase audit (not the docs) on 2026-07-01. Use this as the
"resume here" doc after a context compaction.

## Audit result: nothing is missing

All 15 providers are present and consistent across every layer. The audit
cross-checked: in-app adapter (`src/ats/adapters/`), registry (`bootstrap.ts`),
`ProviderId` union + `PROVIDER_KIND` (`src/ats/types.ts`), connect-screen
`PROVIDER_META` + `CONNECTABLE_PROVIDERS`, Deno client (`_shared/`), and both
dispatch tables (`ats-proxy/index.ts`, `_shared/dispatch.ts`).

- 15 adapters = 15 bootstrap regs = 15 `ProviderId` = 15 `PROVIDER_KIND` = 15
  `PROVIDER_META`. ✓
- 12 Deno clients = 12 proxy cases = 12 shared-dispatch cases (the 12 ATSes). ✓
- 11 `CONNECTABLE_PROVIDERS` == 11 `ready:true`. ✓
- mock has no Deno client (in-process by design); Indeed/ZipRecruiter have no
  Deno client (delegated). Correct, not gaps.

## Adapter matrix

Legend — Client: ✓ live · ⚠️ experimental (unverified) · shell (no Deno client).
Connectable = `ready:true` + in `CONNECTABLE_PROVIDERS`.

| Provider | Kind | Auth | Client | Reads | Writes | Connectable | Verified vs real API |
|---|---|---|---|---|---|---|---|
| mock | ats | none | in-proc | ✓ | ✓ no-ops | yes | n/a (deterministic) |
| greenhouse | ats | Basic (key) | ✓ | ✓ | advance/reject/note/tag | yes | ❌ fixtures only |
| ashby | ats | Basic (key) | ✓ | ✓ | advance/note/tag | yes | ❌ (reject deferred) |
| lever | ats | Basic (key) | ✓ | ✓ | advance/reject/note/tag | yes | ❌ fixtures only |
| workable | ats | Bearer + subdomain | ✓ | ✓ | advance/reject/note/tag | yes | ❌ fixtures only |
| recruitee | ats | Bearer + company_id | ✓ | ✓ | advance/reject/note/tag | yes | ❌ fixtures only |
| teamtailor | ats | Token (key) | ✓ | ✓ | advance/reject | yes | ❌ (NA base + reject unverified) |
| manatal | ats | Token (key) | ✓ | ✓ | — (read-only) | yes | ❌ fixtures only |
| bamboohr | ats | Basic + subdomain | ✓ | ✓ | advance/note | yes | ❌ (pagination + status body) |
| smartrecruiters | ats | OAuth client-creds | ✓ | ✓ | advance/reject | yes | ❌ (candidates/pageId/tokens) |
| jazzhr | ats | key (query param) | ✓ | ✓ | — (read-only) | yes | ❌ (write format unconfirmed) |
| icims | ats | OAuth client-creds + customer_id | ⚠️ | ✓ (guessed) | — | **no** (`ready:false`) | ❌ speculative |
| workday | ats | OAuth + tenant | ⚠️ | ✓ (guessed) | — | **no** (`ready:false`) | ❌ speculative |
| indeed | job_board | partner | shell | — | — | no | delegated (separate agent) |
| ziprecruiter | job_board | partner | shell | — | — | no | delegated (separate agent) |

**Key truth:** NO adapter has been verified against a real provider API yet — every
contract test runs on synthetic fixtures. Getting sandbox creds and confirming
one end-to-end is the single highest-value next step.

## Per-provider unknowns to confirm against a sandbox

- **bamboohr** — `/applications` `paginationComplete` stop-signal; whether the
  status-change body wants the status id as a string vs number. (Free sandbox.)
- **smartrecruiters** — `/jobs/{id}/candidates` path + fields; `pageId` cursor
  shape (vs offset/limit); exact status tokens (OFFER vs OFFERED). (Free sandbox.)
- **jazzhr** — the POST write format (apikey placement + JSON vs form) to promote
  past read-only; plan gate (Pro?).
- **teamtailor** — reject reason attribute; NA-region base (`api.na.teamtailor.com`)
  not handled.
- **manatal** — `stage` vs `job_pipeline_stage` PATCH schema (to add writes).
- **ashby** — reject flow (archive endpoint) still deferred.
- **icims / workday** — everything (see below).

## Experimental scaffolds (⚠️ do not trust)

`_shared/icims.ts` and `_shared/workday.ts` exist and pass contract tests, but the
tests validate normalization against **authored** fixtures — they do NOT prove the
shapes match reality. Both are `ready:false` / not in `CONNECTABLE_PROVIDERS`, so
nothing invokes them. Before going live:
- **iCIMS**: client-credentials + customer_id (needs a 3rd connect-form field).
  Search-then-fetch; object field keys are guesses (`pickStr`). Verify + fix
  mapping.
- **Workday**: auth is a **client-credentials PLACEHOLDER** — the recruiting REST
  API likely needs 3-legged Authorization Code (an app-side OAuth redirect flow
  that doesn't exist; `ats-oauth-callback` is the stub). Candidates endpoint is a
  guess. `GET /jobRequisitions` is the one documented call.

## Delegated (not built here, by design)

**Indeed** and **ZipRecruiter** — partner-gated job boards with a push/webhook
model (not our pull interface). A separate outreach agent owns them. In-app shells
only; methods throw "partner API access required".

## Architecture cheat-sheet (for resuming)

- **Runtime split:** in-app adapter = `capabilities()`/metadata only; real HTTP
  lives in `_shared/<provider>.ts`; `ats-proxy` authenticates via the recruiter
  JWT, decrypts creds via `read_integration_credentials`, dispatches. `client.ts`
  routes mock in-process, everything else through the proxy.
- **Credential model:** the primary secret → Vault (`integrations.credentials_secret_id`),
  returned only by `read_integration_credentials`. Per-provider extras in
  `integrations.extras` jsonb: `subdomain` (workable), `company_id` (recruitee),
  `company_subdomain` (bamboohr), `client_id` (smartrecruiters/icims/workday),
  `customer_id` (icims), `tenant_subdomain` (workday). `on_behalf_of_user_id`
  (greenhouse) is still its own column.
- **OAuth pattern (client-credentials):** secret in Vault, client_id in extras,
  reuse the two-field connect form (no redirect). Token exchange via
  `_shared/http.ts` `fetchClientCredentialsToken()` (SmartRecruiters keeps its own
  inline copy). See the SmartRecruiters client for the reference impl.
- **Deno/TS gotcha:** deno 2.8.3 / TS 6.0.3 raises TS7022 on un-annotated generic
  paginated-helper call sites — annotate `const {items,nextCursor}: {...} = await
  callOnePage<T>(...)`. CI runs `deno test --no-check` so it's a local-only trap.
- **Promote a shell → live:** write `_shared/<p>.ts`, add proxy + dispatch cases,
  add fixtures + contract test, flip `ready:true`, add to `CONNECTABLE_PROVIDERS`;
  add connect-form fields for any extra inputs.
- **Contract test is the gate:** every client must pass
  `_shared/__tests__/contract.test.ts` (22 tests now). App tests: Jest, 3.

## What's left (all external, no code blocked on us)

1. **Sandbox verification** — confirm the per-provider unknowns above. Free
   sandboxes: BambooHR, SmartRecruiters, Lever. This turns "❌ fixtures only" into
   real confidence and is the top priority.
2. **JazzHR** — a Pro account to confirm the write format → promote past read-only.
3. **iCIMS / Workday** — partner access to verify + finish the scaffolds (iCIMS
   needs a 3rd connect field; Workday needs the OAuth redirect flow).
4. **Indeed / ZipRecruiter** — separate outreach agent (webhook receiver, not a
   pull client).
5. **Push delivery** — needs a dev client (Expo Go can't issue push tokens);
   `detect-new-candidates` also needs pg_cron + pg_net scheduling and isn't
   deployed.
6. **Housekeeping** — fold `on_behalf_of_user_id` into `extras`; wire
   `send_template` (skipped for all providers); Teamtailor NA base URL.

## Key files

- Adapters: `src/ats/adapters/<p>/index.ts` · registry `src/ats/{registry,bootstrap}.ts`
  · types `src/ats/types.ts` · facade `src/ats/client.ts`
- Deno clients: `supabase/functions/_shared/<p>.ts` · shared `http.ts` / `dispatch.ts`
  · proxy `supabase/functions/ats-proxy/index.ts`
- Connect UI: `src/app/(app)/connect.tsx` (`PROVIDER_META`, `CONNECTABLE_PROVIDERS`)
- Tests: `supabase/functions/_shared/__tests__/contract.test.ts` (+ `__fixtures__`)
- Docs: `CHANGELOG.md` (running log) · `docs/ats-credentials-guide.md` (how to get
  creds) · this file (status) · `docs/2026-06-*.md` (session deep-dives)
