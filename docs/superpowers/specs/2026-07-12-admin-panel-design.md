# Admin Panel — Design

**Date:** 2026-07-12 · **Status:** Approved (brainstorm with Douglas)
**Phase 1 scope:** read-only panel. Phase 2 (mutations) is sketched but NOT in scope.

## Context

Recruit Swipe has no internal view of its own state. Engineering debugs through
the Supabase dashboard and management has no product picture at all. This adds a
**web-based admin panel** for engineering and management: user & subscription
ops, integration health, product metrics, and (later) support tooling.

## Goals / non-goals

**Goals (Phase 1):** read-only visibility — who the users are, what plans they're
on, whether integrations are healthy, how the product is being used. Access
limited to allowlisted admins.

**Non-goals (Phase 1):** any mutation (comping plans, deleting accounts, editing
teams); charts/BI polish; mobile layout; SSO. Credentials/Vault contents are
never exposed, in any phase.

## Architecture

- **`admin/` folder at repo root** — standalone Vite + React + TypeScript
  (strict) web app. Zero runtime sharing with the Expo app; the Expo bundler
  never sees it. Deps: `react`, `react-router-dom`, `@tanstack/react-query`,
  `@supabase/supabase-js` (auth only).
- **Deploy:** Vercel static build. Env: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (public-safe values).
- **All privileged data flows through one new edge function, `admin-api`** —
  the same trust pattern as `ats-proxy` (JWT-authed entry, privileged
  internals) and `send-push` (service-role gate). **No RLS policy on any
  existing table changes.**

### Auth flow

1. Admin signs in on the panel with existing Supabase email+password auth.
2. Panel POSTs `{ action, ...params }` to `admin-api` with the session JWT.
3. `admin-api` verifies the JWT, then checks the JWT's **email claim** against
   the `admin_users` allowlist (service-role query).
4. Allowlisted → action runs with service role, returns shaped JSON.
   Not allowlisted → `403`; the panel shows a "not an admin" screen.

A regular recruiter signing into the panel authenticates fine and hits the 403
wall — no data beyond what their mobile session could already see.

## Schema — migration `0025_admin.sql`

```sql
create table public.admin_users (
  email text primary key,        -- lower-cased at insert
  note text,                     -- who/why, e.g. 'founder'
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- no policies: service-role only (same pattern as notification_seen)

insert into public.admin_users (email, note)
values ('douglasrich9215@gmail.com', 'founder');
```

- **Email-keyed** (not user_id) so admins can be allowlisted before their
  account exists; the runtime check matches the JWT email claim (lower-cased).
- RLS isolation suite gains a case: `authenticated` cannot read `admin_users`.

## `admin-api` actions (Phase 1 — all read-only)

Dispatch-per-action switch, mirroring `ats-proxy`.

| Action | Returns | View |
|---|---|---|
| `metrics` | signups/day (14d), swipes/day (14d), total recruiters, active-in-7d (`device_tokens.last_seen_at` + `auth.users.last_sign_in_at`), grade count, paid counts by plan | Dashboard |
| `list_users` | paginated + searchable (email/display name): email, display name, org, created_at, plan, connection count, team names | Users |
| `get_user` | profile, subscriptions, integrations (provider/label/created_at — **never credentials**), teams + role, device tokens, swipe/grade counts | User detail |
| `list_subscriptions` | user email, plan, status, seats, current_period_end, stripe_customer_id | Subscriptions |
| `integration_health` | connections by provider; swipe-action failures last 7d (scan `swipes.executed_actions` for `status:'failed'`, with provider + action type); notification topics with stale `last_scanned_at` | Health |

**Hard rule:** no action may return Vault contents, `credentials_secret_id`
plaintext, or any decrypted secret. `get_user` shows that an integration
exists, never its key.

## Panel routes

- `/sign-in` — email + password.
- `/` — dashboard: stat tiles + two small trend tables (signups, swipes).
- `/users` — search + table; row → `/users/:id` detail.
- `/subscriptions` — table.
- `/health` — provider table + recent failures list.

Plain tables and stat tiles; no chart library in v1.

## Phase 2 (sketch only — each item needs its own design pass)

- Mutations: `comp_plan` (admin-granted subscription row,
  `stripe_subscription_id = null`; no collision with the webhook's
  upsert-by-stripe-id path, but weakens the "webhook is sole writer"
  invariant — design carefully), `manage_admins`, `revoke_invite`,
  `delete_user`.
- `admin_audit_log` table — every mutation writes actor, action, target.
- Nothing mutating ships in Phase 1.

## Error handling

- `401` bad/missing JWT → panel redirects to sign-in.
- `403` not allowlisted → explicit "not an admin" screen.
- `400` unknown action / bad params.
- `500` generic message; details only in function logs (same
  never-echo-internals rule as `billing`).

## Testing

- **Deno unit tests** for `admin-api`: non-admin JWT → 403; unknown action →
  400; allowlisted happy path (mocked service-role client).
- **RLS isolation case:** `authenticated` cannot select from `admin_users`.
- Panel: TS-strict only in v1 (internal tool; logic lives server-side).

## Deployment / runbook

- `npx supabase db push` (0025) and
  `npx supabase functions deploy admin-api` — user-run, per convention.
- Panel: `cd admin && npm install && npm run dev` locally; Vercel project
  hookup (import repo, root dir `admin/`, set the two env vars) is a one-time
  user dashboard step.

## Queued behind this feature

Export-ranked-list (PDF via share sheet) was fully scoped on 2026-07-11 and is
queued: see `docs/superpowers/specs/2026-07-12-export-ranked-list-backlog.md`.
