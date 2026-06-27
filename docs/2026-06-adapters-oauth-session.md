# Recruit Swipe — Adapters + First OAuth Session (June 2026)

Follows the hardening session (`docs/2026-06-hardening-session.md`). This session
added two ATS adapters (one of them the project's first OAuth provider), a
credentials-acquisition guide, and a toolchain fix. Use this as the map when
verifying / testing.

Commits (newest first):
- `22dda21` — SmartRecruiters adapter (first OAuth provider)
- `7f104ad` — Deno 2.8/TS6 type-check fix (TS7022)
- `705770c` — per-adapter credentials acquisition guide
- `3fc1dd7` — BambooHR adapter

## How it was verified
- **Edge (Deno):** `deno test --allow-all _shared/__tests__/contract.test.ts`
  (17 tests, up from 15) — now passes **with** type-checking (`deno check`
  clean too, see the TS7022 fix). `deno fmt --check` + `deno lint` clean. Run
  from `supabase/functions/`; Deno is at `~/.deno/bin` (v2.8.3 / TS 6.0.3).
- **App (Expo/RN):** `npm run typecheck`, `npm run lint`, `npm test` (Jest, 3) —
  all green.
- **Not verifiable without external access:** live ATS reads/writes (no sandbox
  creds yet) — both new clients are validated against synthetic fixtures only.

## What landed

### BambooHR adapter (`3fc1dd7`) — reads + advance + note
- `_shared/bamboohr.ts` — Basic auth (API key + `:x`), `Accept: application/json`
  required (BambooHR defaults to XML). Base
  `…/gateway.php/{company_subdomain}/v1/applicant_tracking`. Reads jobs (open
  only), applications (page-number pagination), statuses-as-stages. Candidate
  externalId is the **application id** (the write target). Writes: change status
  (advance_stage), add comment (add_note).
- **Capability corrections vs the old shell:** `canReject: false` (no dedicated
  reject endpoint — rejection is an advance to a rejected status) and
  `canApplyTag: false` (no tag API). Honest capability-driven UI.
- Wired into ats-proxy (`extras.company_subdomain`) + shared `dispatch.ts`.
  Connect screen: `ready: true`, API-key + subdomain fields.

### Credentials acquisition guide (`705770c`)
- `docs/ats-credentials-guide.md` — skimmable, per-adapter: what credential to
  collect (key + extras), access model (free sandbox / trial / customer account
  / plan-gated / partner), where to get it, and a suggested order of attack.
  Synthesized from `prompts/ats_access_tracker.csv` (gitignored). Indeed /
  ZipRecruiter left to the separate outreach agent.

### Deno TS7022 fix (`7f104ad`)
- Deno 2.8.3 bundles TypeScript 6.0.3, whose stricter circular-inference check
  flagged `const { items, nextCursor } = await callOnePage<T>(...)` (and
  manatal's `getPage<T>`) inside generic `callPaged<T>` / `walkAll<T>` as
  implicit-any. Annotated the receiving bindings with their already-correct
  types in six clients (ashby, greenhouse, lever, manatal, recruitee, workable).
  No runtime change. CI was never red (the edge job runs `deno test --no-check`);
  this restores a clean local `deno check`. **New clients must keep annotating**
  (or give the helper an explicit return type, like bamboohr/smartrecruiters do).

### SmartRecruiters adapter (`22dda21`) — reads + advance + reject, FIRST OAuth
- `_shared/smartrecruiters.ts` — OAuth 2.0 **client-credentials**
  (server-to-server, no app redirect). Exchanges `client_id`/`client_secret` at
  `/identity/oauth/token` for a bearer token per invocation. Reads jobs +
  `/jobs/{id}/candidates` (`content`/`nextPageId` cursor). Stages = the fixed
  main-status enum (no API: LEAD/NEW/IN_REVIEW/INTERVIEW/OFFERED/HIRED). Writes
  PUT `/candidates/{id}/jobs/{jobId}/status`; reject = `status: REJECTED`.
  Notes/tags deferred.
- **Credential model (reusable pattern):** `client_secret` → Vault (the
  credential), `client_id` → `extras.client_id`. This reuses the existing
  two-field connect form with **zero new UI** (apiKey field = secret, tenant
  field = client id; `PROVIDER_META.authType` stays `'api_key'` to render it).
  This is the template iCIMS / Workday should follow where they're
  client-credentials.
- Contract test stubs the token exchange as a fetch route.

## Known NOT verified (needs sandbox access)
- **BambooHR:** the `/applications` `paginationComplete` stop-signal, and whether
  the status-change body wants the status id as a string vs number. (Free dev
  sandbox available — best next verification.)
- **SmartRecruiters:** the `/jobs/{id}/candidates` path + fields, the `pageId`
  pagination shape (vs offset/limit), and the exact status tokens (OFFER vs
  OFFERED). (Free sandbox available.)
- **Push delivery / detect-new-candidates scheduling:** unchanged from the prior
  session — still need a dev client + pg_cron/pg_net.

## Adapter status snapshot
- **Live (9, incl. mock):** mock, greenhouse, ashby, lever, workable, recruitee,
  teamtailor (reads + advance + reject), manatal (reads-only), bamboohr (reads +
  advance + note), smartrecruiters (reads + advance + reject).
- **Capability-only shells (3):** workday, jazzhr, icims.
- **Partner-delegated (2):** indeed, ziprecruiter (separate outreach agent).

## Recommended next steps
1. **Verify against free sandboxes** — BambooHR + SmartRecruiters + Lever are all
   free. This is the first chance to confirm real reads/writes and close the
   sandbox-flagged unknowns above.
2. **JazzHR** — simplest remaining shell to build (API-key, query-param auth),
   mirrors the existing pattern. (Plan-gate uncertain — confirm before assuming.)
3. **iCIMS / Workday** — start partner OAuth applications early (long lead); reuse
   the SmartRecruiters client-credentials pattern where it fits.
4. **Dev client** — when ready to validate push delivery + native gesture polish
   (decoupled from ATS work, which runs fine in Expo Go).
