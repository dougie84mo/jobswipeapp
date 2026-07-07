# Getting Credentials for Recruit Swipe ATS Adapters

A practical checklist for obtaining the API credentials each adapter needs. For
every provider: what to collect, how hard it is to get, where to get it, and
what to paste into the **Connect** screen (the API key/token plus any `extras`
field). Ordered so you can start testing fastest first.

> Source of record for status/contacts: `prompts/outreach/_TRACKER.md`
> (gitignored), with a per-provider execution packet beside it
> (`prompts/outreach/<provider>.md` — channel, steps, ready-to-send email).
> This guide is the human-readable summary. Indeed / ZipRecruiter outreach is
> owned by a **separate agent** — don't self-serve those here.

**Connect-screen inputs by provider** (what the form asks for):

| Provider | API credential | Extra field | Adapter status |
|---|---|---|---|
| BambooHR | API key | company subdomain | ✅ live (reads + advance + note) |
| Lever | API key | — | ✅ live (reads + writes) |
| Recruitee | personal token | company ID (numeric) | ✅ live (reads + writes) |
| Workable | access token | subdomain | ✅ live (reads + writes) |
| Greenhouse | Harvest API key | + your Greenhouse user ID (for writes) | ✅ live (reads + writes) |
| Ashby | API key | — | ✅ live (reads + writes, no reject) |
| Teamtailor | API key | — | ⚠️ live (reads + advance + reject only) |
| Manatal | API token | — | ⚠️ live (read-only) |
| SmartRecruiters | OAuth client | — | ✅ live (reads + advance + reject) · ⚠️ no self-serve sandbox |
| JazzHR | API key | — | ⚠️ live (read-only) |
| iCIMS | OAuth client | customer ID | 🚧 shell (partner-gated) |
| Workday | OAuth client | tenant subdomain | 🚧 shell (partner-gated) |

---

## Tier 1 — Free sandbox or trial (start here)

These get you a working test environment at no cost. Best ROI for verifying real
reads/writes.

### BambooHR
- **Get:** API key + your company subdomain (`https://<subdomain>.bamboohr.com`).
- **Access:** **Free** complimentary test accounts (max **2 per developer**) —
  requested via the form at https://partners.bamboohr.com/developer-sandbox/
  (a rep replies within 1–2 business days; not instant self-serve).
- **Where:** Sign up at https://developers.bamboohr.com (browser — bot-blocks
  fetchers), then submit the test-account form. In an account the key is under
  the user menu → **API Keys → Add New Key** (the key owner needs ATS-settings
  access).
- **Verify in the sandbox:** the Hiring/ATS module is enabled (else
  `applicant_tracking` reads 404), the `/applications` pagination stop-signal,
  and whether the status-change body wants the status id as a string or number.
  Bonus: the ATS API documents an **Update Applicant Status** endpoint — a
  reject-shaped write (advance to a rejected status) may be promotable.

### Lever
- **Get:** API key. (Writes already supported by the adapter.)
- **Access:** **Free** Integrator Sandbox — a persistent dev environment.
  Lever emails OAuth Client ID/Secret + the sandbox account after registration.
- **Where:** Register via
  https://partnerexperience.lever.co/hc/en-us/articles/20089356876189-Step-1-Register-for-OAuth-Sandbox
  (⚠️ browser only — the page bot-blocks fetchers; the form needs a callback
  URI and a **hosted square logo URL**). Sandbox API base is
  `api.sandbox.lever.co/v1` (⚠️ sandbox auth is OAuth; customer prod keys stay
  Basic). In a live account: **Settings → Integrations and API → API
  Credentials → Generate a new API key** (grant postings/opportunities/stages/
  tags read + opportunities write scopes).

### Recruitee
- **Get:** personal API token + company ID (numeric).
- **Access:** **Free** 18-day trial on the Advance plan, which includes API.
- **Where:** Start a trial, then **Settings → Apps and plugins → Personal API
  tokens → New token**. The numeric company ID is shown next to the token. API
  base is `https://api.recruitee.com/c/<company_id>`.

### Workable
- **Get:** access token + account subdomain.
- **Access:** **Free** 15-day trial (Standard-plan features, no credit card).
  API available on all plans.
- **Where:** https://www.workable.com/free-trial → trial, then profile icon →
  **Settings → Integrations → Apps → API Access Tokens → + Generate API token**
  (scopes: r_jobs, r_candidates, r_stages, w_candidates, w_comments). API base
  is `https://<subdomain>.workable.com/spi/v3`.
- ⚠️ Tokens now carry **mandatory expiry** (30d–2y, renewable) — pick 2y and
  record the renewal date; the stored credential will lapse eventually.

---

## Tier 2 — Needs a customer account (no free sandbox)

Adapters are built; you just need access to an account with API enabled.

### Greenhouse
- **Get:** Harvest API key + your Greenhouse **user ID** (for write actions —
  the On-Behalf-Of header). User ID: **People → your name → URL ends
  `/users/<id>`**.
- **Access:** Customer account (sales-led); no self-serve sandbox.
- **Where:** **Configure → Dev Center → API Credential Management** (needs the
  "Can manage ALL organization's API Credentials" permission), grant Harvest
  read scopes (jobs/applications/candidates/job stages/tags) + write scopes
  (move/reject/notes/tags).
- 🚨 **Deadline:** Harvest v1/v2 are **removed after 2026-08-31**, and **v3
  changes auth from Basic to OAuth** (Dev Center issues a "Harvest V3 (OAuth)"
  client id/secret; custom integrations use client-credentials — same
  Vault/extras pattern as SmartRecruiters). Our current Basic-auth Deno client
  stops working then — the v3 migration is a scheduled engineering task, not
  optional.
- Partner program note: application (web form at
  greenhouse.com/integration-partner) now requires **1+ mutual customer** and
  an active website with a privacy policy; Pro-tier customers get a sandbox
  included. See `prompts/outreach/greenhouse.md`.

### Ashby
- **Get:** API key.
- **Access:** Customer workspace; no public sandbox.
- **Where:** **Settings → Integrations → Developer API**. Scopes:
  candidatesRead, candidatesWrite, jobsRead, interviewsRead,
  hiringProcessMetadataRead. (Adapter supports advance/note/tag; **reject is
  deferred**.)

### Teamtailor
- **Get:** admin API key.
- **Access:** Self-serve key, but on higher/quote-based tiers.
- **Where:** **Settings → Integrations → API keys** (Company Admin only; key
  types Public/Internal/Admin — create an **Admin read/write** key). Adapter
  does reads + advance + reject only (tags/notes/messaging deferred). ⚠️ The
  **NA region** base (`api.na.teamtailor.com/v1`) isn't handled yet — use an
  EU/global account for now. Partner contact: techpartnerships@teamtailor.com
  (partner.teamtailor.com is a docs portal, not an intake form). 14-day free
  trial exists; whether API keys work on trial is unverified.

### SmartRecruiters
- **Get:** OAuth 2.0 client (client-credentials): `client_secret` → Vault,
  `client_id` → `extras.client_id`. No tenant/customer id needed.
- **Access:** ⚠️ **No self-serve sandbox or trial** (the free SmartStart tier
  is discontinued; "SmartSandbox" is a paid enterprise add-on, not a developer
  signup). Two routes: a customer's **Credential Manager** (New Credential →
  OAuth client ID; scopes fixed at creation) or partner-level credentials from
  the **Partner Success/Support Team**.
- **Where:** https://developers.smartrecruiters.com/docs/get-started. Token
  endpoint `POST https://api.smartrecruiters.com/identity/oauth/token`.
- **Verify when access lands:** the three flagged client unknowns — candidates
  listing path, `nextPageId` pagination, exact main-status tokens.

---

## Tier 3 — Plan-gated (paid tier required)

### Manatal
- **Get:** API token (Manatal support enables API access).
- **Access:** **Enterprise Plus** plan (~$55/user/mo).
- **Where:** https://developers.manatal.com/reference/getting-started, then
  **Admin → API**. Adapter is **read-only** (writes deferred pending stage-field
  verification). V3 only — V1/V2 are dead.

### JazzHR
- **Get:** API key (passed as an `apikey=` query param).
- **Access:** Plan gate is **unconfirmed** (docs conflict between all-plans vs
  Pro+). Confirm before assuming Pro.
- **Where:** https://apidoc.jazzhrapis.com/. Base `api.resumatorapi.com/v1`.
  Adapter is **live but read-only** — sourcing works and swipes record locally;
  write-back (advance/note) is deferred until the POST format is confirmed
  against a Pro account (sources conflict on apikey placement + body format).

---

## Tier 4 — Partner-gated (long lead; OAuth + agreements)

Start these early because approval takes weeks. Adapters are **shells** — and
they're deliberately **not built blind** (unlike the others, their read shapes
aren't publicly documented, so a speculative client couldn't be validated). Each
needs partner sandbox access before its Deno client is worth writing.

- **iCIMS** — OAuth 2.0 **client-credentials** (region auth servers
  `login.icims{.com,.eu,.ca}/oauth`) + **customer id**. Three inputs (client
  id/secret + customer id), so the connect form needs a third field. Sandbox
  only after approval + a video validation step. Apply:
  https://partnerportal.icims.com/partners/s/apply (DeveloperHelp@icims.com);
  the per-customer User Request Form is a lighter path than full partnership.
  **Build blocker beyond access:** the read model is search-then-fetch (`POST
  /customers/{id}/search/{jobs,applicantworkflows}` → ids, then `GET` each) and
  the object field shapes aren't public — needs sandbox to map. Auth will reuse
  the SmartRecruiters client-credentials pattern.
- **Workday** — Workday Innovation Partners (ISV), OAuth 2.0 + **tenant**. Base
  `https://{tenant}.workday.com/ccx/api/recruiting/vNN/`. No pre-deal sandbox
  (tenant comes from a customer); revenue-share agreement.
  https://workday.my.site.com/prospectportal/become-a-partner. Weeks-to-months.
  **Build blocker beyond access:** the recruiting REST API points to the
  **3-legged Authorization Code grant** (needs an app-side OAuth redirect flow we
  don't have — `ats-oauth-callback` is the stub), and the candidate-retrieval
  endpoint/fields aren't publicly documented (`GET /jobRequisitions` is).

## Delegated — do not self-serve here

- **Indeed** and **ZipRecruiter** are job boards behind signed partner
  agreements, and their applicant flow is push/webhook based (Indeed Apply /
  Apply Webhook), not the pull model our adapters use. **A separate outreach
  agent owns these** — don't create accounts or build clients for them from this
  repo.

---

## Suggested order of attack (revised 2026-07-04; packets added 2026-07-06)

> Every provider now has an execution-ready packet in `prompts/outreach/`
> (channel, steps, filled email draft, follow-up schedule) and a row in
> `prompts/outreach/_TRACKER.md`. The ranking below matches the packets'
> priority headers.

Re-ranked after a 2026 access re-check. Two corrections drove it: **SmartRecruiters
has no self-serve sandbox** (creds need a customer workspace or partner approval),
and **BambooHR's ATS is a separate "Hiring" module** that may be absent from the
trial. So the true lowest-friction start is a pure-ATS free trial.

1. **Workable (15-day) or Recruitee (18-day) trial** — self-serve token, whole
   product is an ATS so jobs/candidates/stages are guaranteed, adapters fully live
   incl. writes. **Start here** — highest-confidence end-to-end verification.
2. **BambooHR** trial (free, adapter live) — verify advance + note writes, but
   first confirm the **Hiring/ATS module** is present or `applicant_tracking`
   reads 404.
3. **Lever** Integrator Sandbox (free + persistent, short partner-reg wait) —
   second real-write validation.
4. **JazzHR** (confirm plan gate) — promote past read-only once the POST format
   is confirmed.
5. **SmartRecruiters** — ⚠️ deferred: no self-serve sandbox; needs a customer
   Credential Manager or Partner Success approval.
6. Kick off **iCIMS** / **Workday** partner applications in parallel (long lead) —
   their Deno clients wait on sandbox access.
7. **Greenhouse** / **Ashby** / **Teamtailor** when a customer account is available.
