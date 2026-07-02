# Next Session Kickoff — Connecting Real ATS APIs

**Paste the "Kickoff prompt" block below into a new chat to resume.** Everything
under it is the reference context that prompt points at.

Status as of 2026-07-01: all buildable adapters are written and internally
consistent (see `docs/adapter-status.md`). **Zero adapters are verified against a
real provider API** — every contract test runs on synthetic fixtures. The next
phase is *external*: get real credentials, connect live, and turn "❌ fixtures
only" into confirmed behavior.

---

## Kickoff prompt (copy into a new chat)

> We're moving Recruit Swipe from "adapters written" to "adapters verified against
> real APIs." Read `docs/next-session-kickoff.md`, `docs/adapter-status.md`, and
> `docs/ats-credentials-guide.md` first.
>
> I'm going to start creating sandbox/developer accounts for the adapters that
> allow self-serve access. Walk me through it one provider at a time, in the
> priority order in the kickoff doc. For each provider: tell me exactly what
> credentials/fields to collect, help me connect it through the app's Connect
> screen, then we run a live read against a real requisition and diff the
> normalized output against what the Deno client expects — fixing field mappings,
> pagination, and status tokens as we find mismatches. Update the contract-test
> fixtures to match reality once confirmed, and flip the doc's verification column
> from "❌ fixtures only" to "✓ verified."
>
> Start with **[provider]** — tell me how to get the credentials.

Fill in `[provider]` with whichever account you've created first (recommend
BambooHR — see below).

---

## Which adapters can be worked on NOW (self-serve, no partner deal)

These have a free or trial sandbox you can create yourself today. Priority order
is by ease-of-access + how much each unlocks:

### 1. BambooHR — free developer sandbox (start here)
- **Why first:** BambooHR hands out a free 30-day trial + a permanent developer
  sandbox with sample ATS data. Fastest path to a real end-to-end read.
- **Auth:** Basic (API key + `:x`). **Fields to collect:** API key, company
  subdomain (`{company_subdomain}.bamboohr.com`).
- **Where:** Sign up at bamboohr.com/signup (free trial) → account settings →
  API Keys → generate. Subdomain is in your login URL.
- **What we get:** open jobs, applications per job (candidates), account statuses
  (stages). Writes: advance stage (status change), add note (comment).
- **Unknowns to confirm live** (from `docs/adapter-status.md`):
  - `/applications` pagination — does `paginationComplete` fire as expected?
  - Status-change body — status id as **string vs number**?

### 2. SmartRecruiters — free sandbox + first OAuth
- **Why:** proves the OAuth client-credentials path end-to-end. Free sandbox at
  their developer portal.
- **Auth:** OAuth 2.0 client-credentials. **Fields:** client_id (→ `extras`),
  client_secret (→ Vault). No app redirect.
- **Where:** developers.smartrecruiters.com → register an app in a sandbox
  company → get client id/secret.
- **What we get:** jobs, `/jobs/{id}/candidates`, fixed status enum, advance +
  reject.
- **Unknowns:** the `/jobs/{id}/candidates` path + field names; the `pageId`
  cursor shape (vs offset/limit); exact status tokens (`OFFER` vs `OFFERED`).

### 3. Lever — sandbox via Lever's dev program
- **Auth:** Basic (API key). **Fields:** API key.
- **What we get:** full reads + advance/reject/note/tag (most complete write set).
- **Unknowns:** mostly a confidence pass — `archiveOpportunity` needs a valid
  `reason_id`; tags PUT-replaces (we merge before writing — confirm the merge).

### Also self-serve-ish (lower priority / caveats)
- **Ashby** — free tier exists; reads work, **reject is deferred** (archive
  endpoint unconfirmed). Good target to *add* reject once we can see the API.
- **Workable / Recruitee / Teamtailor / Manatal** — trial accounts exist but are
  more involved to provision. Teamtailor also has an **NA-region base URL**
  (`api.na.teamtailor.com`) we don't handle yet. Manatal is read-only until we
  confirm the `stage` vs `job_pipeline_stage` PATCH schema.
- **Greenhouse** — sandbox needs their Harvest API access; writes require an
  `on_behalf_of_user_id`. Verify reads first.
- **JazzHR** — read-only today; a **Pro** account is needed to confirm the write
  format (apikey placement + JSON vs form) before enabling writes.

## Which adapters CANNOT be worked on yet (blocked, external)

- **iCIMS / Workday** — partner-gated (ISV agreement, no self-serve sandbox) AND
  undocumented read shapes. Scaffolds are `ready:false` and unverified. Also:
  Workday's real auth is likely 3-legged Authorization Code (needs the
  `ats-oauth-callback` redirect flow, which is only a stub), and iCIMS needs a
  3rd connect-form field (`customer_id`). Don't touch until partner access lands.
- **Indeed / ZipRecruiter** — partner-gated job boards, push/webhook model.
  Owned by the **separate outreach agent** — do not build here.

## The per-provider verification loop (what "connecting" means)

For each provider with real credentials:

1. **Collect creds** per the fields above → connect via the app's Connect screen
   (`src/app/(app)/connect.tsx`). Secret goes to Vault via `create_integration`;
   `client_id` / `subdomain` / `company_id` etc. go to `integrations.extras`.
2. **Live read** — open the integration, list requisitions, open a requisition,
   list candidates. This exercises the Deno client through `ats-proxy` end-to-end.
3. **Diff vs expectations** — compare the normalized `NormRequisition` /
   `NormCandidate` output against what the client mapped. Watch for: missing/empty
   fields (wrong key guesses), broken pagination (never terminates or stops early),
   wrong stage/status tokens.
4. **Fix** the `_shared/<provider>.ts` mapping / pagination / tokens as needed.
5. **Update fixtures** in `_shared/__fixtures__/responses.ts` to match the REAL
   response shape, and confirm `_shared/__tests__/contract.test.ts` still passes
   (`deno test` from `supabase/functions/`).
6. **Test a write** (providers that support it) against a throwaway candidate —
   advance stage / add note — and confirm it lands in the provider UI.
7. **Record it** — flip the row in `docs/adapter-status.md` from "❌ fixtures only"
   to "✓ verified (date)", add a `CHANGELOG.md` entry, update `CLAUDE.md`'s
   provider table if capabilities changed.

## Deploy reminders (before live testing)

Live reads hit the deployed edge functions, not local code. After any Deno-client
change:
- `npx supabase functions deploy ats-proxy` (redeploys the shared clients too).
- Migrations, if any: `npx supabase db push`.
- The app talks only to Supabase — no app rebuild needed for Deno-client fixes.

## Key files (same as adapter-status)

- Deno clients: `supabase/functions/_shared/<provider>.ts` · shared `http.ts` /
  `dispatch.ts` · proxy `supabase/functions/ats-proxy/index.ts`
- Fixtures/tests: `supabase/functions/_shared/__fixtures__/responses.ts` ·
  `_shared/__tests__/contract.test.ts`
- Connect UI: `src/app/(app)/connect.tsx` (`PROVIDER_META`, `CONNECTABLE_PROVIDERS`)
- Credential how-to: `docs/ats-credentials-guide.md`
- Status matrix: `docs/adapter-status.md`
