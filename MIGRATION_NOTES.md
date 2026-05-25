# Migration Notes

The previous Recruit Swipe codebase (then named "JobActual" / "jobswipe") was a Node/Express + Sequelize backend with a Create React App frontend. It modeled a dual-sided job board: recruiters posted jobs, job seekers swiped on jobs, and a mutual right-swipe created a "match" with in-app messaging.

This Expo rebuild retires the job-seeker half of the product entirely. Candidates now live in the recruiter's ATS (Greenhouse, Lever, Workable, etc.); Recruit Swipe is a recruiter-only lens onto that pipeline.

The legacy codebase is preserved verbatim under `legacy/` as a read-only reference for data shapes and business logic. **Do not import from `legacy/` into the new app** — transcribe shapes if useful.

## What carried over (in spirit, not in code)

| Legacy concept | Where it lives in `legacy/` | New equivalent |
|---|---|---|
| Swipe direction + idempotency (one swipe per `(user, target)`) | `legacy/models/Swipe.js`, `legacy/routes/swipes.js:43-64` | `swipes` table with `unique (user_id, candidate_id)` |
| Swipe-history pagination + filter-by-direction | `legacy/routes/swipes.js:295-351` | TanStack Query hook against `swipes` (built in phase 7) |
| Swipe-stats aggregation (totals, % right/left, match rate) | `legacy/routes/swipes.js:356-410` | Supabase view or RPC (built in phase 10) |
| `RecruiterProfile` shape (display name, org) | `legacy/models/RecruiterProfile.js` | `recruiter_profiles` table — slimmed down (no `monthlyJobPostingLimit`, no `verificationDocuments`, no `isAdmin`) |

## What was discarded and why

| Legacy concept | Why dropped |
|---|---|
| `Users.userType` (`'jobseeker' \| 'recruiter'`) | Recruiter-only product. Discriminator is gone. Auth handled by Supabase `auth.users`. |
| `JobSeekerProfile` (~30 fields, resume, desired salary, etc.) | Candidates live in the ATS, not in our database. |
| `Job` (~30 fields: title, description, salary, benefits, skills, status, promotion) | The app no longer hosts job listings. Requisitions are pulled from the ATS into a thin `requisitions` cache that keeps `external_id` + `raw` jsonb. |
| `Company`, `CompanyRecruiter`, `JobRecruiter` (in-flight m2m + permission system) | No multi-recruiter org features in this rebuild. The in-progress permissions migration under `legacy/migrations/add-permission-system.js` is frozen. |
| `Match` (bilateral "both right-swiped" handshake, `matchScore`, `archived` flags) | Candidates don't swipe. Closest equivalent is a swipe record + ATS state — derivable, no separate table needed. |
| `Message` (in-app chat between matched users) | Out of scope. Messaging happens in the recruiter's ATS via the configured `send_template` or `send_message` swipe action. |
| `Subscription`, `SubscriptionTransaction` | Out of scope for this rebuild. Re-introducible later. |
| `PasswordReset` | Supabase Auth handles password resets natively. |
| AI match-score service (`legacy/routes/swipes.js:131-162` and elsewhere) | Out of scope for this rebuild. Re-introducible later as a Supabase edge function fed by ATS-cached candidate data. |
| Express + Sequelize + SQLite stack | Replaced wholesale by Supabase (Postgres + Auth + RLS + Edge Functions). |
| Create React App web client | Replaced by the Expo app at the repo root. |
| Socket.io live messaging (`legacy/socket.js`) | No in-app messaging in this rebuild. Supabase Realtime is available if/when we need live updates (e.g. sync status). |
| Postman collection (`legacy/postman-collection.json`) | API surface changed entirely; the new client talks to Supabase REST/RPC + edge functions. |

## Schema diff at a glance

**Legacy:** Users, JobSeekerProfiles, RecruiterProfiles, Companies, CompanyRecruiters, JobRecruiters, Jobs, Swipes, Matches, Messages, Subscriptions, SubscriptionTransactions, PasswordResets.

**New:** auth.users (Supabase), recruiter_profiles, integrations, integration_settings, requisitions, candidates, swipes.

Six new tables vs. thirteen legacy tables. The new schema is narrower because the app no longer owns the candidate database of record.

## Notes on the in-progress legacy work

The legacy working tree was left dirty when development paused — modifications to `legacy/models/Job.js`, `legacy/models/RecruiterProfile.js`, `legacy/models/CompanyRecruiter.js`, `legacy/routes/companies.js`, `legacy/routes/jobs.js`, and `legacy/DB_SCHEMA.js`, plus untracked additions for a multi-recruiter permission system (`legacy/migrations/add-permission-system.js`, `legacy/models/JobRecruiter.js`, scripts under `legacy/scripts/`).

That work is **frozen** as part of the legacy reference. It is not being ported, because the rebuild discards `Company`, `CompanyRecruiter`, and `JobRecruiter` entirely.
