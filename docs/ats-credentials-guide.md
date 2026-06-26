# Getting Credentials for Recruit Swipe ATS Adapters

A practical checklist for obtaining the API credentials each adapter needs. For
every provider: what to collect, how hard it is to get, where to get it, and
what to paste into the **Connect** screen (the API key/token plus any `extras`
field). Ordered so you can start testing fastest first.

> Source of record for status/contacts: `prompts/ats_access_tracker.csv`
> (gitignored). This guide is the human-readable summary. Indeed / ZipRecruiter
> outreach is owned by a **separate agent** — don't self-serve those here.

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
| SmartRecruiters | OAuth client | — | 🚧 shell (needs Deno client + OAuth) |
| JazzHR | API key | — | 🚧 shell |
| iCIMS | OAuth client | customer ID | 🚧 shell (partner-gated) |
| Workday | OAuth client | tenant subdomain | 🚧 shell (partner-gated) |

---

## Tier 1 — Free sandbox or trial (start here)

These get you a working test environment at no cost. Best ROI for verifying real
reads/writes.

### BambooHR ⭐ recommended first
- **Get:** API key + your company subdomain (`https://<subdomain>.bamboohr.com`).
- **Access:** **Free** developer/sandbox account. Not partner-gated.
- **Where:** Sign up at https://developers.bamboohr.com/login for a free dev
  account. In a real account the key is under **Profile → API Keys → Add New
  Key** (the key owner needs ATS-settings access).
- **Why first:** adapter is already live and the sandbox is free — you can
  confirm advance-stage + add-note writes immediately. Two things to verify in
  the sandbox: the `/applications` pagination stop-signal and whether the
  status-change body wants the status id as a string or number.

### Lever
- **Get:** API key. (Writes already supported by the adapter.)
- **Access:** **Free** Integrator Sandbox — a persistent dev environment.
- **Where:** Register for the OAuth/Integrator Sandbox via
  https://partnerexperience.lever.co/hc/en-us/articles/20089356876189. Sandbox
  API base is `api.sandbox.lever.co/v1`. In a live account: **Settings →
  Integrations → API → Generate a new API key** (grant postings/opportunities/
  stages/tags read + opportunities write scopes).

### Recruitee
- **Get:** personal API token + company ID (numeric).
- **Access:** **Free** 18-day trial on the Advance plan, which includes API.
- **Where:** Start a trial, then **Settings → Apps and plugins → Personal API
  tokens → New token**. The numeric company ID is shown next to the token. API
  base is `https://api.recruitee.com/c/<company_id>`.

### Workable
- **Get:** access token + account subdomain.
- **Access:** **Free** 15-day trial (use as a throwaway test workspace).
- **Where:** https://www.workable.com/developers → trial, then **Settings →
  Integrations → API Access Tokens → New token** (scopes: r_jobs, r_candidates,
  r_stages, w_candidates, w_comments). API base is
  `https://<subdomain>.workable.com/spi/v3`.

### SmartRecruiters (account is free; adapter not built yet)
- **Get:** OAuth 2.0 client (client-credentials). No tenant/customer id needed.
- **Access:** **Free** Sandbox environment. Partner approval only needed later
  for multi-customer distribution.
- **Where:** https://developers.smartrecruiters.com/docs/partners-overview.
  Token endpoint `/identity/oauth/token`.
- **Note:** most tractable OAuth provider, but the adapter is still a
  capability-only shell — getting the sandbox now lets us build + verify the
  Deno client and OAuth flow against it.

---

## Tier 2 — Needs a customer account (no free sandbox)

Adapters are built; you just need access to an account with API enabled.

### Greenhouse
- **Get:** Harvest API key + your Greenhouse **user ID** (for write actions —
  the On-Behalf-Of header). User ID: **People → your name → URL ends
  `/users/<id>`**.
- **Access:** Customer account (sales-led); no self-serve sandbox.
- **Where:** **Configure → Dev Center → API Credential Management → Manage API
  Keys**, grant Harvest read scopes (jobs/applications/candidates/job
  stages/tags) + write scopes (move/reject/notes/tags).
- ⏰ **Deadline:** Harvest v1/v2 retire after **2026-08-31** — confirm the client
  targets v3 before relying on it.

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
- **Where:** **Settings → Integrations → API keys.** Adapter does reads +
  advance + reject only (tags/notes/messaging deferred). ⚠️ The **NA region**
  base (`api.na.teamtailor.com/v1`) isn't handled yet — use an EU/global account
  for now.

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
  Adapter is a shell — Deno client not built yet.

---

## Tier 4 — Partner-gated (long lead; OAuth + agreements)

Start these early because approval takes weeks. Adapters are shells.

- **iCIMS** — Partner/Marketplace, OAuth 2.0 + customer id. Sandbox only after
  approval + a video validation step. Apply:
  https://partnerportal.icims.com/partners/s/apply (DeveloperHelp@icims.com).
  The per-customer User Request Form is a lighter path than full partnership.
- **Workday** — Workday Innovation Partners (ISV), OAuth 2.0 + tenant. No
  pre-deal sandbox (tenant comes from a customer); revenue-share agreement.
  https://workday.my.site.com/prospectportal/become-a-partner. Weeks-to-months.

## Delegated — do not self-serve here

- **Indeed** and **ZipRecruiter** are job boards behind signed partner
  agreements, and their applicant flow is push/webhook based (Indeed Apply /
  Apply Webhook), not the pull model our adapters use. **A separate outreach
  agent owns these** — don't create accounts or build clients for them from this
  repo.

---

## Suggested order of attack

1. **BambooHR** sandbox (free, adapter live) — verify writes end to end.
2. **Lever** sandbox (free, adapter live) — second real-write validation.
3. **Recruitee** / **Workable** trials (free, adapters live) — broaden coverage.
4. **SmartRecruiters** sandbox (free) — unblocks building the first OAuth adapter.
5. Kick off **iCIMS** / **Workday** partner applications in parallel (long lead).
6. **Greenhouse** / **Ashby** / **Teamtailor** when a customer account is available.
