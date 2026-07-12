# Admin Panel Phase 1 (Read-Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A web admin panel (allowlisted admins only) with read-only views of users, subscriptions, integration health, and product metrics.

**Architecture:** A static Vite+React app in `admin/` talks to one new JWT-authed edge function, `admin-api`, which checks the caller's email against a new `admin_users` table and runs read-only queries with the service role. No existing RLS policy changes. Spec: `docs/superpowers/specs/2026-07-12-admin-panel-design.md`.

**Tech Stack:** Postgres migration (Supabase), Deno edge function (`supabase-js@2.46.0` via esm.sh), Vite 7 + React 19 + TypeScript strict + react-router-dom 7 + TanStack Query 5.

## Global Constraints

- TypeScript strict everywhere; no `any` without a justifying comment (edge code uses `// deno-lint-ignore no-explicit-any` + `type DB = any` at supabase-js boundaries, same as `supabase/tests/rls/isolation.test.ts`).
- Edge code style: single quotes (enforced by `supabase/functions/deno.json` fmt config). Imports pin `https://esm.sh/@supabase/supabase-js@2.46.0` and `https://deno.land/std@0.224.0/assert/mod.ts`.
- **Phase 1 is read-only.** No admin-api action may INSERT/UPDATE/DELETE anything.
- **Never return credentials**: no action returns Vault contents, `credentials_secret_id`, or decrypted secrets.
- Errors: `500` responses return `{"error":"internal error"}` only; details go to `console.error` (function logs).
- Migration is numbered `0025`; body follows existing migration comment style.
- Windows dev box: run Deno from `supabase/functions/` (deno on PATH via `~/.deno/bin`). PowerShell 5.1: no `&&` — chain with `;`.
- Commits: no Co-Authored-By footer (project convention).
- Deploys to hosted (`db push`, `functions deploy`) are USER-run; the plan only verifies locally.
- `executed_actions` entry shape (from `src/features/swipes/execute-actions.ts`): `{ descriptor: { type: string, ... }, status: 'success' | 'failure' | 'skipped', executedAt: string, message?: string }`. Note: failure status literal is `'failure'`, **not** `'failed'` (the spec sketch said `'failed'`; the code is authoritative).

## File Structure

```
supabase/migrations/0025_admin.sql            # admin_users + seed + admin_list_auth_users()
supabase/tests/rls/isolation.test.ts          # + admin_users invisibility test (modify)
supabase/functions/admin-api/handler.ts       # CORS + auth gate + dispatch (DI, testable)
supabase/functions/admin-api/actions.ts       # the 5 read-only actions (service client)
supabase/functions/admin-api/index.ts         # Deno.serve wiring real deps
supabase/functions/admin-api/__tests__/handler.test.ts
admin/                                        # Vite+React panel (new folder)
  package.json  tsconfig.json  vite.config.ts  index.html  .gitignore  .env.example
  src/main.tsx  src/styles.css
  src/lib/supabase.ts  src/lib/api.ts  src/lib/session.ts
  src/components/Layout.tsx  StatTile.tsx  DataTable.tsx  ErrorNote.tsx
  src/routes/SignIn.tsx  Dashboard.tsx  Users.tsx  UserDetail.tsx  Subscriptions.tsx  Health.tsx
CHANGELOG.md                                  # entry (modify)
```

---

### Task 1: Migration 0025 — `admin_users` + auth-users helper (+ RLS test)

**Files:**
- Create: `supabase/migrations/0025_admin.sql`
- Modify: `supabase/tests/rls/isolation.test.ts` (append one `Deno.test` block)

**Interfaces:**
- Produces: table `public.admin_users (email text pk, note text, created_at)` — service-role-only (RLS on, no policies). Seeded with `douglasrich9215@gmail.com`.
- Produces: RPC `public.admin_list_auth_users() returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)` — SECURITY DEFINER, `grant execute to service_role` only. Emails returned lower-cased. Task 3+ call it via `admin.rpc('admin_list_auth_users')`.

- [ ] **Step 1: Write the failing RLS test**

Append to `supabase/tests/rls/isolation.test.ts` (after the existing `Deno.test` block; match the file's double-quote style):

```ts
Deno.test("RLS: admin_users is invisible to authenticated users", async () => {
  const service = createClient<DB>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `rls-admin-${crypto.randomUUID()}@example.test`;
  let userId = "";

  try {
    userId = await createUser(service, email);
    const token = await signIn(email);
    const me = anonClient(token);

    // RLS enabled with no policies: SELECT succeeds but returns zero rows.
    const { data: rows, error: selErr } = await me
      .from("admin_users")
      .select("email");
    assertEquals(selErr, null);
    assertEquals(rows ?? [], []);

    // ...even though the seeded founder row exists (visible to service role).
    const { data: seeded } = await service
      .from("admin_users")
      .select("email")
      .eq("email", "douglasrich9215@gmail.com");
    assertEquals((seeded ?? []).length, 1);

    // Writes are rejected outright.
    const { error: insErr } = await me
      .from("admin_users")
      .insert({ email: "evil@example.test" });
    assert(insErr !== null);

    // The auth-users helper is not executable by authenticated users.
    const { error: rpcErr } = await me.rpc("admin_list_auth_users");
    assert(rpcErr !== null);
  } finally {
    if (userId) await service.auth.admin.deleteUser(userId);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

The RLS suite needs the local stack (Docker):

```powershell
npx supabase start          # skip if already running
npx supabase db reset       # applies migrations 0001-0024 (0025 doesn't exist yet)
deno test --allow-net --allow-env supabase/tests/rls/isolation.test.ts
```

Expected: the new test FAILS (relation `public.admin_users` does not exist — surfaces as a non-null `selErr`, so `assertEquals(selErr, null)` throws). The pre-existing isolation test still passes.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0025_admin.sql`:

```sql
-- Recruit Swipe — admin panel (phase 1: read-only).
--
-- admin_users is the allowlist for the web admin panel. The admin-api edge
-- function verifies the caller's JWT, lower-cases its email claim, and checks
-- it against this table using the service role. RLS is enabled with NO
-- policies — the same pattern as notification_seen — so anon/authenticated
-- can neither read nor write it; only the service role (which bypasses RLS)
-- can touch it.
--
-- Email-keyed (not user_id) so an admin can be allowlisted before their
-- account exists.

create table public.admin_users (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

insert into public.admin_users (email, note)
values ('douglasrich9215@gmail.com', 'founder')
on conflict (email) do nothing;

-- ============================================================================
-- Auth-users read helper
-- ============================================================================

-- PostgREST only exposes the public schema, so the service-role client can't
-- select from auth.users directly. This SECURITY DEFINER function packages the
-- four columns the admin panel needs (emails lower-cased to match the
-- allowlist convention). Granted ONLY to service_role — same trust model as
-- read_pending_notification_scans (0015).
create or replace function public.admin_list_auth_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, lower(u.email), u.created_at, u.last_sign_in_at
  from auth.users u;
$$;

revoke all on function public.admin_list_auth_users() from public, anon, authenticated;
grant execute on function public.admin_list_auth_users() to service_role;
```

- [ ] **Step 4: Apply and run the test to verify it passes**

```powershell
npx supabase db reset       # now applies through 0025
deno test --allow-net --allow-env supabase/tests/rls/isolation.test.ts
```

Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations/0025_admin.sql supabase/tests/rls/isolation.test.ts
git commit -m "feat: admin_users allowlist + auth-users helper (migration 0025)"
```

---

### Task 2: `admin-api` handler — gate + dispatch (TDD)

**Files:**
- Create: `supabase/functions/admin-api/handler.ts`
- Test: `supabase/functions/admin-api/__tests__/handler.test.ts`

**Interfaces:**
- Produces: `makeHandler(deps: AdminApiDeps): (req: Request) => Promise<Response>` where

```ts
interface AdminApiDeps {
  getEmail: (req: Request) => Promise<string | null>;
  isAdmin: (email: string) => Promise<boolean>;
  actions: Record<string, (params: Record<string, unknown>) => Promise<unknown>>;
}
```

- Task 5's `index.ts` consumes `makeHandler` with real deps. Request contract: `POST { "action": string, "params"?: object }` → `200` JSON result, or `401`/`403`/`400`/`405`/`500` with `{ "error": string }`.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/admin-api/__tests__/handler.test.ts` (single quotes — deno fmt enforces):

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { type AdminApiDeps, makeHandler } from '../handler.ts';

function post(body: unknown): Request {
  return new Request('http://localhost/admin-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-jwt',
    },
    body: JSON.stringify(body),
  });
}

function deps(overrides: Partial<AdminApiDeps> = {}): AdminApiDeps {
  return {
    getEmail: () => Promise.resolve('admin@example.test'),
    isAdmin: () => Promise.resolve(true),
    actions: { ping: (params) => Promise.resolve({ ok: true, params }) },
    ...overrides,
  };
}

Deno.test('admin-api: OPTIONS preflight returns 204', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', { method: 'OPTIONS' }),
  );
  assertEquals(res.status, 204);
});

Deno.test('admin-api: non-POST returns 405', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', { method: 'GET' }),
  );
  assertEquals(res.status, 405);
  await res.body?.cancel();
});

Deno.test('admin-api: 401 when the JWT resolves to no email', async () => {
  const handler = makeHandler(deps({ getEmail: () => Promise.resolve(null) }));
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'invalid token' });
});

Deno.test('admin-api: 403 when the email is not allowlisted', async () => {
  const handler = makeHandler(deps({ isAdmin: () => Promise.resolve(false) }));
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'not an admin' });
});

Deno.test('admin-api: 400 on invalid JSON body', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-jwt' },
      body: 'not json',
    }),
  );
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test('admin-api: 400 on unknown action', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'drop_tables' }));
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'unknown action drop_tables' });
});

Deno.test('admin-api: dispatches to the action and returns its result', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'ping', params: { a: 1 } }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, params: { a: 1 } });
});

Deno.test('admin-api: params defaults to {} when omitted', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, params: {} });
});

Deno.test('admin-api: 500 hides internal error details', async () => {
  const handler = makeHandler(deps({
    actions: {
      boom: () => Promise.reject(new Error('secret internal detail')),
    },
  }));
  const res = await handler(post({ action: 'boom' }));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'internal error' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
cd supabase/functions
deno test admin-api/__tests__/handler.test.ts
```

Expected: FAIL — `Module not found "../handler.ts"`.

- [ ] **Step 3: Write the handler**

Create `supabase/functions/admin-api/handler.ts`:

```ts
// admin-api request pipeline: CORS -> JWT email -> allowlist -> dispatch.
//
// Dependency-injected (AdminApiDeps) so the gate and dispatch are unit-testable
// without network; index.ts wires the real Supabase-backed implementations.

export interface AdminApiDeps {
  /** Resolve the caller's email from the request's JWT; null = invalid. */
  getEmail: (req: Request) => Promise<string | null>;
  /** True when the (lower-cased) email is in admin_users. */
  isAdmin: (email: string) => Promise<boolean>;
  /** Action name -> implementation. All phase-1 actions are read-only. */
  actions: Record<string, (params: Record<string, unknown>) => Promise<unknown>>;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function makeHandler(
  deps: AdminApiDeps,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    const email = await deps.getEmail(req);
    if (!email) {
      return jsonResponse({ error: 'invalid token' }, 401);
    }
    if (!(await deps.isAdmin(email))) {
      return jsonResponse({ error: 'not an admin' }, 403);
    }

    let body: { action?: unknown; params?: unknown };
    try {
      body = (await req.json()) as { action?: unknown; params?: unknown };
    } catch {
      return jsonResponse({ error: 'invalid JSON body' }, 400);
    }

    const actionName = typeof body.action === 'string' ? body.action : '';
    const action = deps.actions[actionName];
    if (!action) {
      return jsonResponse({ error: `unknown action ${actionName}` }, 400);
    }

    const params = (typeof body.params === 'object' && body.params !== null)
      ? (body.params as Record<string, unknown>)
      : {};

    try {
      return jsonResponse(await action(params));
    } catch (err) {
      // Never echo internals to the client — logs only (same rule as billing).
      console.error(`admin-api ${actionName} failed:`, err);
      return jsonResponse({ error: 'internal error' }, 500);
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
cd supabase/functions
deno test admin-api/__tests__/handler.test.ts
deno fmt --check admin-api
deno lint admin-api
```

Expected: 9 tests PASS; fmt and lint clean.

- [ ] **Step 5: Commit**

```powershell
git add supabase/functions/admin-api
git commit -m "feat: admin-api handler — allowlist gate + action dispatch (TDD)"
```

---

### Task 3: `actions.ts` part 1 — shared helpers, `metrics`, `list_subscriptions`

**Files:**
- Create: `supabase/functions/admin-api/actions.ts`

**Interfaces:**
- Consumes: RPC `admin_list_auth_users` (Task 1).
- Produces (consumed by Task 5 index.ts and the panel's `lib/api.ts`):
  - `metrics(admin) → { totals: { recruiters: number; grades: number; activeLast7d: number }, paidByPlan: Record<string, number>, signupsByDay: Array<{day,count}>, swipesByDay: Array<{day,count}> }`
  - `listSubscriptions(admin) → { subscriptions: Array<{ userId, email, plan, status, seats, currentPeriodEnd, stripeCustomerId }> }`
  - Internal helpers reused by Task 4/5: `listAuthUsers`, `isoDaysAgo`, `bucketByDay`, `ENTITLED`, `firstError`.

- [ ] **Step 1: Write the module with helpers + two actions**

Create `supabase/functions/admin-api/actions.ts`:

```ts
// admin-api actions — every function runs with the SERVICE ROLE client behind
// the admin_users allowlist gate (handler.ts). Phase 1: ALL READ-ONLY.
//
// Hard rule: nothing here may return Vault contents, credentials_secret_id,
// or any decrypted secret. Integrations are surfaced as provider/label only.
//
// Data volumes are early-stage: unpaginated selects ride the PostgREST
// max_rows=1000 default. Revisit with real pagination when any table nears it.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

// No generated Database types in edge functions; narrow at each boundary.
// deno-lint-ignore no-explicit-any
type DB = any;

const DAY_MS = 86_400_000;

/** Stripe statuses that count as entitled (mirrors entitlements.ts). */
const ENTITLED = ['active', 'trialing', 'past_due'];

/** Highest-to-lowest, for picking a user's effective plan. */
const PLAN_RANK = ['team_pro', 'pro', 'basic'];

interface AuthUserRow {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

async function listAuthUsers(admin: SupabaseClient<DB>): Promise<AuthUserRow[]> {
  const { data, error } = await admin.rpc('admin_list_auth_users');
  if (error) throw new Error(`admin_list_auth_users: ${error.message}`);
  return (data ?? []) as AuthUserRow[];
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** Zero-filled per-day counts for the trailing `days` window (UTC days). */
function bucketByDay(
  isoDates: Array<string | null>,
  days: number,
): Array<{ day: string; count: number }> {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10), 0);
  }
  for (const iso of isoDates) {
    if (!iso) continue;
    const day = iso.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([day, count]) => ({ day, count }));
}

/** Throw on the first PostgREST error in a batch of results. */
function firstError(results: Array<{ error: { message: string } | null }>): void {
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
  }
}

// ============================================================================
// metrics
// ============================================================================

export async function metrics(admin: SupabaseClient<DB>): Promise<unknown> {
  const since7 = isoDaysAgo(7);
  const [authUsers, recruiters, grades, swipes, subs, tokens] = await Promise
    .all([
      listAuthUsers(admin),
      admin.from('recruiter_profiles').select('user_id', {
        count: 'exact',
        head: true,
      }),
      admin.from('candidate_grades').select('id', {
        count: 'exact',
        head: true,
      }),
      admin.from('swipes').select('created_at').gte(
        'created_at',
        isoDaysAgo(14),
      ),
      admin.from('subscriptions').select('plan, status'),
      admin.from('device_tokens').select('user_id').gte('last_seen_at', since7),
    ]);
  firstError([recruiters, grades, swipes, subs, tokens]);

  // Active = pushed a device heartbeat OR signed in within 7 days.
  const activeUserIds = new Set<string>(
    ((tokens.data ?? []) as Array<{ user_id: string }>).map((t) => t.user_id),
  );
  const since7Ms = Date.parse(since7);
  for (const u of authUsers) {
    if (u.last_sign_in_at && Date.parse(u.last_sign_in_at) >= since7Ms) {
      activeUserIds.add(u.user_id);
    }
  }

  const paidByPlan: Record<string, number> = { basic: 0, pro: 0, team_pro: 0 };
  for (
    const s of (subs.data ?? []) as Array<{ plan: string; status: string }>
  ) {
    if (ENTITLED.includes(s.status)) {
      paidByPlan[s.plan] = (paidByPlan[s.plan] ?? 0) + 1;
    }
  }

  return {
    totals: {
      recruiters: recruiters.count ?? 0,
      grades: grades.count ?? 0,
      activeLast7d: activeUserIds.size,
    },
    paidByPlan,
    signupsByDay: bucketByDay(authUsers.map((u) => u.created_at), 14),
    swipesByDay: bucketByDay(
      ((swipes.data ?? []) as Array<{ created_at: string }>).map((s) =>
        s.created_at
      ),
      14,
    ),
  };
}

// ============================================================================
// list_subscriptions
// ============================================================================

export async function listSubscriptions(
  admin: SupabaseClient<DB>,
): Promise<unknown> {
  const [authUsers, subs] = await Promise.all([
    listAuthUsers(admin),
    admin.from('subscriptions').select(
      'user_id, plan, status, seats, current_period_end, stripe_customer_id',
    ).order('created_at', { ascending: false }),
  ]);
  firstError([subs]);

  const emailByUser = new Map(authUsers.map((u) => [u.user_id, u.email]));
  interface SubRow {
    user_id: string;
    plan: string;
    status: string;
    seats: number;
    current_period_end: string | null;
    stripe_customer_id: string;
  }
  return {
    subscriptions: ((subs.data ?? []) as SubRow[]).map((s) => ({
      userId: s.user_id,
      email: emailByUser.get(s.user_id) ?? '',
      plan: s.plan,
      status: s.status,
      seats: s.seats,
      currentPeriodEnd: s.current_period_end,
      stripeCustomerId: s.stripe_customer_id,
    })),
  };
}

export { ENTITLED, PLAN_RANK, bucketByDay, firstError, isoDaysAgo, listAuthUsers };
export type { AuthUserRow, DB };
```

- [ ] **Step 2: Verify it type-checks, formats, and lints**

```powershell
cd supabase/functions
deno check admin-api/actions.ts
deno fmt --check admin-api
deno lint admin-api
```

Expected: all clean. (No unit tests for actions — they are thin PostgREST queries; the gate/dispatch carries the test coverage per the spec, and end-to-end verification happens in Task 11.)

- [ ] **Step 3: Commit**

```powershell
git add supabase/functions/admin-api/actions.ts
git commit -m "feat: admin-api actions — metrics + list_subscriptions"
```

---

### Task 4: `actions.ts` part 2 — `list_users`, `get_user`

**Files:**
- Modify: `supabase/functions/admin-api/actions.ts` (append two exported functions)

**Interfaces:**
- Consumes: `listAuthUsers`, `firstError`, `ENTITLED`, `PLAN_RANK` from Task 3 (same module).
- Produces:
  - `listUsers(admin, params: { search?: string }) → { users: Array<{ userId, email, displayName, orgName, createdAt, plan, connectionCount, teamNames: string[] }> }` (newest first; `search` filters email/displayName, case-insensitive)
  - `getUser(admin, params: { userId: string }) → { user: { userId, email, createdAt, lastSignInAt }, profile: { displayName, orgName }, subscriptions: [...], integrations: Array<{ id, provider, displayLabel, connectedAt, sharedTeamId }>, teams: Array<{ teamId, name, role }>, deviceTokens: Array<{ platform, deviceName, lastSeenAt }>, counts: { swipes, grades } }`

- [ ] **Step 1: Append the two actions**

Append to `supabase/functions/admin-api/actions.ts` (before the final `export {` block; then fold the new names into that block — final exports listed in Step 2):

```ts
// ============================================================================
// list_users
// ============================================================================

export async function listUsers(
  admin: SupabaseClient<DB>,
  params: Record<string, unknown>,
): Promise<unknown> {
  const search = typeof params.search === 'string'
    ? params.search.trim().toLowerCase()
    : '';

  const [authUsers, profiles, integrations, subs, memberships] = await Promise
    .all([
      listAuthUsers(admin),
      admin.from('recruiter_profiles').select(
        'user_id, display_name, org_name, created_at',
      ),
      admin.from('integrations').select('user_id'),
      admin.from('subscriptions').select('user_id, plan, status'),
      admin.from('team_members').select('user_id, teams(name)'),
    ]);
  firstError([profiles, integrations, subs, memberships]);

  const emailByUser = new Map(authUsers.map((u) => [u.user_id, u.email]));

  const connectionCounts = new Map<string, number>();
  for (
    const i of (integrations.data ?? []) as Array<{ user_id: string }>
  ) {
    connectionCounts.set(i.user_id, (connectionCounts.get(i.user_id) ?? 0) + 1);
  }

  const planByUser = new Map<string, string>();
  for (
    const s of (subs.data ?? []) as Array<
      { user_id: string; plan: string; status: string }
    >
  ) {
    if (!ENTITLED.includes(s.status)) continue;
    const current = planByUser.get(s.user_id);
    if (
      !current || PLAN_RANK.indexOf(s.plan) < PLAN_RANK.indexOf(current)
    ) {
      planByUser.set(s.user_id, s.plan);
    }
  }

  const teamsByUser = new Map<string, string[]>();
  for (
    const m of (memberships.data ?? []) as Array<
      { user_id: string; teams: { name: string } | null }
    >
  ) {
    if (!m.teams) continue;
    const list = teamsByUser.get(m.user_id) ?? [];
    list.push(m.teams.name);
    teamsByUser.set(m.user_id, list);
  }

  interface ProfileRow {
    user_id: string;
    display_name: string | null;
    org_name: string | null;
    created_at: string;
  }
  const users = ((profiles.data ?? []) as ProfileRow[])
    .map((p) => ({
      userId: p.user_id,
      email: emailByUser.get(p.user_id) ?? '',
      displayName: p.display_name,
      orgName: p.org_name,
      createdAt: p.created_at,
      plan: planByUser.get(p.user_id) ?? 'freelancer',
      connectionCount: connectionCounts.get(p.user_id) ?? 0,
      teamNames: teamsByUser.get(p.user_id) ?? [],
    }))
    .filter((u) =>
      !search || u.email.includes(search) ||
      (u.displayName ?? '').toLowerCase().includes(search)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { users };
}

// ============================================================================
// get_user
// ============================================================================

export async function getUser(
  admin: SupabaseClient<DB>,
  params: Record<string, unknown>,
): Promise<unknown> {
  const userId = typeof params.userId === 'string' ? params.userId : '';
  if (!userId) throw new Error('get_user: userId is required');

  const [
    authUsers,
    profile,
    subs,
    integrations,
    memberships,
    tokens,
    swipeCount,
    gradeCount,
  ] = await Promise.all([
    listAuthUsers(admin),
    admin.from('recruiter_profiles').select('display_name, org_name')
      .eq('user_id', userId).maybeSingle(),
    admin.from('subscriptions').select(
      'plan, status, seats, current_period_end, stripe_customer_id',
    ).eq('user_id', userId),
    // provider/label/timestamps ONLY — never credential columns.
    admin.from('integrations').select(
      'id, provider, display_label, connected_at, shared_team_id',
    ).eq('user_id', userId),
    admin.from('team_members').select('team_id, role, teams(name)')
      .eq('user_id', userId),
    admin.from('device_tokens').select('platform, device_name, last_seen_at')
      .eq('user_id', userId),
    admin.from('swipes').select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin.from('candidate_grades').select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  firstError([profile, subs, integrations, memberships, tokens]);

  const authUser = authUsers.find((u) => u.user_id === userId);
  if (!authUser) throw new Error('get_user: no such user');

  interface IntegrationRow {
    id: string;
    provider: string;
    display_label: string | null;
    connected_at: string;
    shared_team_id: string | null;
  }
  interface MembershipRow {
    team_id: string;
    role: string;
    teams: { name: string } | null;
  }
  interface TokenRow {
    platform: string;
    device_name: string | null;
    last_seen_at: string;
  }
  interface SubRow {
    plan: string;
    status: string;
    seats: number;
    current_period_end: string | null;
    stripe_customer_id: string;
  }

  const profileRow = profile.data as
    | { display_name: string | null; org_name: string | null }
    | null;

  return {
    user: {
      userId,
      email: authUser.email,
      createdAt: authUser.created_at,
      lastSignInAt: authUser.last_sign_in_at,
    },
    profile: {
      displayName: profileRow?.display_name ?? null,
      orgName: profileRow?.org_name ?? null,
    },
    subscriptions: ((subs.data ?? []) as SubRow[]).map((s) => ({
      plan: s.plan,
      status: s.status,
      seats: s.seats,
      currentPeriodEnd: s.current_period_end,
      stripeCustomerId: s.stripe_customer_id,
    })),
    integrations: ((integrations.data ?? []) as IntegrationRow[]).map((i) => ({
      id: i.id,
      provider: i.provider,
      displayLabel: i.display_label,
      connectedAt: i.connected_at,
      sharedTeamId: i.shared_team_id,
    })),
    teams: ((memberships.data ?? []) as MembershipRow[]).map((m) => ({
      teamId: m.team_id,
      name: m.teams?.name ?? '',
      role: m.role,
    })),
    deviceTokens: ((tokens.data ?? []) as TokenRow[]).map((t) => ({
      platform: t.platform,
      deviceName: t.device_name,
      lastSeenAt: t.last_seen_at,
    })),
    counts: {
      swipes: swipeCount.count ?? 0,
      grades: gradeCount.count ?? 0,
    },
  };
}
```

- [ ] **Step 2: Consolidate the module's trailing export block**

The bottom of `actions.ts` must end with exactly:

```ts
export { ENTITLED, PLAN_RANK, bucketByDay, firstError, isoDaysAgo, listAuthUsers };
export type { AuthUserRow, DB };
```

(`listUsers`/`getUser` are already exported inline via `export async function`.)

- [ ] **Step 3: Verify**

```powershell
cd supabase/functions
deno check admin-api/actions.ts
deno fmt --check admin-api
deno lint admin-api
```

Expected: clean.

- [ ] **Step 4: Commit**

```powershell
git add supabase/functions/admin-api/actions.ts
git commit -m "feat: admin-api actions — list_users + get_user"
```

---

### Task 5: `actions.ts` part 3 — `integration_health`; wire `index.ts`

**Files:**
- Modify: `supabase/functions/admin-api/actions.ts` (append one function)
- Create: `supabase/functions/admin-api/index.ts`

**Interfaces:**
- Produces: `integrationHealth(admin) → { connectionsByProvider: Array<{provider,count}>, recentFailures: Array<{provider, actionType, swipedAt, detail}>, staleTopics: Array<{topicId, provider, requisitionExternalId, lastScannedAt}> }`
- Produces: deployed function name **`admin-api`**, action names exactly: `metrics`, `list_users`, `get_user`, `list_subscriptions`, `integration_health` (the panel's `lib/api.ts` depends on these strings).

- [ ] **Step 1: Append `integrationHealth` to actions.ts**

```ts
// ============================================================================
// integration_health
// ============================================================================

export async function integrationHealth(
  admin: SupabaseClient<DB>,
): Promise<unknown> {
  const [integrations, swipes, topics] = await Promise.all([
    admin.from('integrations').select('provider'),
    // Provider comes via swipes -> requisitions -> integrations embedding.
    admin.from('swipes').select(
      'created_at, executed_actions, requisitions(integrations(provider))',
    ).gte('created_at', isoDaysAgo(7)),
    admin.from('notification_topics').select(
      'id, requisition_external_id, last_scanned_at, integrations(provider)',
    ).eq('enabled', true),
  ]);
  firstError([integrations, swipes, topics]);

  const connectionsByProvider = new Map<string, number>();
  for (
    const i of (integrations.data ?? []) as Array<{ provider: string }>
  ) {
    connectionsByProvider.set(
      i.provider,
      (connectionsByProvider.get(i.provider) ?? 0) + 1,
    );
  }

  // executed_actions entries (execute-actions.ts):
  // { descriptor: { type, ... }, status: 'success'|'failure'|'skipped',
  //   executedAt, message? }
  interface ExecutedEntry {
    descriptor?: { type?: string };
    status?: string;
    message?: string;
  }
  interface SwipeRow {
    created_at: string;
    executed_actions: unknown;
    requisitions: { integrations: { provider: string } | null } | null;
  }
  const recentFailures: Array<{
    provider: string;
    actionType: string;
    swipedAt: string;
    detail: string | null;
  }> = [];
  for (const s of (swipes.data ?? []) as SwipeRow[]) {
    const entries = Array.isArray(s.executed_actions)
      ? s.executed_actions as ExecutedEntry[]
      : [];
    for (const e of entries) {
      if (e.status !== 'failure') continue;
      recentFailures.push({
        provider: s.requisitions?.integrations?.provider ?? 'unknown',
        actionType: e.descriptor?.type ?? 'unknown',
        swipedAt: s.created_at,
        detail: e.message ?? null,
      });
    }
  }
  recentFailures.sort((a, b) => b.swipedAt.localeCompare(a.swipedAt));

  // Stale = enabled topic never scanned, or last scan > 60 min ago (4x the
  // 15-minute cron cadence from migration 0024).
  const staleCutoffMs = Date.now() - 60 * 60_000;
  interface TopicRow {
    id: string;
    requisition_external_id: string;
    last_scanned_at: string | null;
    integrations: { provider: string } | null;
  }
  const staleTopics = ((topics.data ?? []) as TopicRow[])
    .filter((t) =>
      !t.last_scanned_at || Date.parse(t.last_scanned_at) < staleCutoffMs
    )
    .map((t) => ({
      topicId: t.id,
      provider: t.integrations?.provider ?? 'unknown',
      requisitionExternalId: t.requisition_external_id,
      lastScannedAt: t.last_scanned_at,
    }));

  return {
    connectionsByProvider: [...connectionsByProvider.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count),
    recentFailures,
    staleTopics,
  };
}
```

- [ ] **Step 2: Create index.ts wiring real deps**

Create `supabase/functions/admin-api/index.ts`:

```ts
// Edge function: admin-api
//
// The web admin panel's only data source. JWT-authenticated (verify_jwt
// default true — no config.toml entry needed); on top of that, the caller's
// email claim must exist in public.admin_users (checked with the service
// role — the table has RLS on with no policies, so it is service-role-only).
//
// Phase 1: five READ-ONLY actions (metrics, list_users, get_user,
// list_subscriptions, integration_health). No action returns credentials or
// Vault contents. Mutations are phase 2 and DO NOT belong here yet.
//
// Request:  POST { "action": string, "params"?: object }
// Response: 200 action result | 401 invalid token | 403 not an admin |
//           400 bad request | 500 { "error": "internal error" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { makeHandler } from './handler.ts';
import {
  getUser,
  integrationHealth,
  listSubscriptions,
  listUsers,
  metrics,
} from './actions.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getEmail(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.email) return null;
  return data.user.email.toLowerCase();
}

async function isAdmin(email: string): Promise<boolean> {
  const { data, error } = await admin
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`admin_users lookup: ${error.message}`);
  return data !== null;
}

Deno.serve(makeHandler({
  getEmail,
  isAdmin,
  actions: {
    metrics: () => metrics(admin),
    list_users: (params) => listUsers(admin, params),
    get_user: (params) => getUser(admin, params),
    list_subscriptions: () => listSubscriptions(admin),
    integration_health: () => integrationHealth(admin),
  },
}));
```

- [ ] **Step 3: Verify the whole function**

```powershell
cd supabase/functions
deno check admin-api/index.ts
deno test admin-api/__tests__/handler.test.ts
deno fmt --check admin-api
deno lint admin-api
```

Expected: check clean, 9 tests pass, fmt/lint clean.

- [ ] **Step 4: Commit**

```powershell
git add supabase/functions/admin-api
git commit -m "feat: admin-api — integration_health + Deno.serve wiring"
```

---

### Task 6: Panel scaffold (`admin/`)

**Files:**
- Create: `admin/package.json`, `admin/tsconfig.json`, `admin/vite.config.ts`, `admin/index.html`, `admin/.gitignore`, `admin/.env.example`, `admin/src/styles.css`, `admin/src/lib/supabase.ts`, `admin/src/main.tsx` (placeholder — replaced in Task 7)

**Interfaces:**
- Produces: `supabase` client + `FUNCTIONS_URL` + `SUPABASE_ANON_KEY` exports from `admin/src/lib/supabase.ts` (consumed by Tasks 7–10). Build command `npm run build` = `tsc --noEmit && vite build`.

- [ ] **Step 1: Write the scaffold files**

`admin/package.json`:

```json
{
  "name": "recruit-swipe-admin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.46.0",
    "@tanstack/react-query": "^5.59.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.9.2",
    "vite": "^7.0.0"
  }
}
```

`admin/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`admin/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
```

`admin/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recruit Swipe Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`admin/.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.local
```

`admin/.env.example`:

```
# Copy to .env.local and fill in. Same values the Expo app uses
# (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in the root .env) — both public-safe.
VITE_SUPABASE_URL=https://lbhikadtsmbnzkzetpyb.supabase.co
VITE_SUPABASE_ANON_KEY=
```

`admin/src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it in.',
  );
}

export const supabase = createClient(url, anonKey);
export const FUNCTIONS_URL = `${url}/functions/v1`;
export const SUPABASE_ANON_KEY = anonKey;
```

`admin/src/styles.css`:

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #1a1d21;
  background: #f5f6f8;
}
.shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 200px;
  padding: 20px 14px;
  background: #101828;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sidebar h1 { font-size: 15px; margin: 0 0 14px; }
.sidebar a {
  color: #cbd2dc;
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
}
.sidebar a.active { background: #208aef; color: #fff; }
.sidebar button {
  margin-top: auto;
  background: none;
  border: 1px solid #3a4356;
  color: #cbd2dc;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
}
.content { flex: 1; padding: 28px; max-width: 1100px; }
.content h2 { margin-top: 0; }
.center { display: grid; place-items: center; min-height: 100vh; }
.tiles { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 24px; }
.tile {
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  padding: 14px 18px;
  min-width: 150px;
}
.tile .label { font-size: 12px; color: #667085; }
.tile .value { font-size: 26px; font-weight: 700; }
table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e4e7ec; border-radius: 10px; }
th, td { text-align: left; padding: 9px 12px; font-size: 14px; border-bottom: 1px solid #eef1f4; }
th { color: #667085; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
tr.clickable { cursor: pointer; }
tr.clickable:hover { background: #f7f9fc; }
form.signin {
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  padding: 28px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
form.signin input {
  padding: 10px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 14px;
}
form.signin button {
  padding: 10px;
  background: #208aef;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.error { color: #d92d20; font-size: 13px; }
.muted { color: #667085; font-size: 13px; }
.row-grids { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.searchbar { display: flex; gap: 8px; margin-bottom: 14px; }
.searchbar input {
  flex: 1;
  max-width: 340px;
  padding: 9px 11px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
}
section { margin-bottom: 26px; }
```

`admin/src/main.tsx` (placeholder; Task 7 replaces it):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="center">Recruit Swipe Admin — scaffold OK</div>
  </StrictMode>,
);
```

- [ ] **Step 2: Install and verify the build**

```powershell
cd admin
npm install
npm run build
```

Expected: `tsc --noEmit` clean, `vite build` emits `dist/`. (The env check in `lib/supabase.ts` throws at *runtime*, not build time — the build must pass without `.env.local`.)

- [ ] **Step 3: Commit**

```powershell
cd ..
git add admin
git commit -m "feat: admin panel scaffold — Vite + React + TS strict"
```

(`admin/package-lock.json` IS committed — only the root `.gitignore`'s `legacy/**/package-lock.json` exclusion exists, which doesn't match `admin/`.)

---

### Task 7: Session + API layer + sign-in + guarded shell

**Files:**
- Create: `admin/src/lib/session.ts`, `admin/src/lib/api.ts`, `admin/src/components/Layout.tsx`, `admin/src/components/ErrorNote.tsx`, `admin/src/routes/SignIn.tsx`
- Modify: `admin/src/main.tsx` (real router; routes stubbed inline until Tasks 8–10)

**Interfaces:**
- Consumes: `supabase`, `FUNCTIONS_URL`, `SUPABASE_ANON_KEY` (Task 6); action names from Task 5.
- Produces (Tasks 8–10 consume): `useSession()`, `callAdminApi<T>(action, params?)`, `AdminApiError` (with `.status`), response types `Metrics`, `AdminUserRow`, `UserDetail`, `SubscriptionRow`, `Health`, `DayCount`; components `Layout`, `ErrorNote`.

- [ ] **Step 1: Write the session hook**

`admin/src/lib/session.ts`:

```ts
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 2: Write the API layer with response types**

`admin/src/lib/api.ts`:

```ts
// Typed client for the admin-api edge function. Response shapes mirror
// supabase/functions/admin-api/actions.ts — keep the two in sync by hand
// (no codegen; the function shapes responses explicitly).

import { FUNCTIONS_URL, SUPABASE_ANON_KEY, supabase } from './supabase';

export interface DayCount {
  day: string;
  count: number;
}

export interface Metrics {
  totals: { recruiters: number; grades: number; activeLast7d: number };
  paidByPlan: Record<string, number>;
  signupsByDay: DayCount[];
  swipesByDay: DayCount[];
}

export interface AdminUserRow {
  userId: string;
  email: string;
  displayName: string | null;
  orgName: string | null;
  createdAt: string;
  plan: string;
  connectionCount: number;
  teamNames: string[];
}

export interface UserDetail {
  user: {
    userId: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
  };
  profile: { displayName: string | null; orgName: string | null };
  subscriptions: Array<{
    plan: string;
    status: string;
    seats: number;
    currentPeriodEnd: string | null;
    stripeCustomerId: string;
  }>;
  integrations: Array<{
    id: string;
    provider: string;
    displayLabel: string | null;
    connectedAt: string;
    sharedTeamId: string | null;
  }>;
  teams: Array<{ teamId: string; name: string; role: string }>;
  deviceTokens: Array<{
    platform: string;
    deviceName: string | null;
    lastSeenAt: string;
  }>;
  counts: { swipes: number; grades: number };
}

export interface SubscriptionRow {
  userId: string;
  email: string;
  plan: string;
  status: string;
  seats: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
}

export interface Health {
  connectionsByProvider: Array<{ provider: string; count: number }>;
  recentFailures: Array<{
    provider: string;
    actionType: string;
    swipedAt: string;
    detail: string | null;
  }>;
  staleTopics: Array<{
    topicId: string;
    provider: string;
    requisitionExternalId: string;
    lastScannedAt: string | null;
  }>;
}

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function callAdminApi<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminApiError('not signed in', 401);

  const res = await fetch(`${FUNCTIONS_URL}/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, params }),
  });

  const body: unknown = await res.json();
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new AdminApiError(message, res.status);
  }
  return body as T;
}
```

- [ ] **Step 3: Write ErrorNote + Layout**

`admin/src/components/ErrorNote.tsx`:

```tsx
import { AdminApiError } from '../lib/api';

export function ErrorNote({ error }: { error: unknown }) {
  if (error instanceof AdminApiError && error.status === 403) {
    return (
      <p className="error">
        This account isn&apos;t an admin. Ask an existing admin to allowlist
        your email in admin_users.
      </p>
    );
  }
  const message = error instanceof Error ? error.message : 'Request failed';
  return <p className="error">{message}</p>;
}
```

`admin/src/components/Layout.tsx`:

```tsx
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';

export function Layout() {
  const { session, loading } = useSession();
  if (loading) return <div className="center">Loading…</div>;
  if (!session) return <Navigate to="/sign-in" replace />;

  return (
    <div className="shell">
      <nav className="sidebar">
        <h1>Recruit Swipe Admin</h1>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/users">Users</NavLink>
        <NavLink to="/subscriptions">Subscriptions</NavLink>
        <NavLink to="/health">Health</NavLink>
        <button type="button" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </button>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write SignIn**

`admin/src/routes/SignIn.tsx`:

```tsx
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="center">
      <form className="signin" onSubmit={(e) => void onSubmit(e)}>
        <h1>Recruit Swipe Admin</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          Admin access only — non-allowlisted accounts see no data.
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Replace main.tsx with the router (stub routes inline)**

`admin/src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SignIn } from './routes/SignIn';
import './styles.css';

// Tasks 8-10 replace these stubs with real routes.
const Stub = ({ name }: { name: string }) => <h2>{name} — coming in a later task</h2>;

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Stub name="Dashboard" />} />
            <Route path="/users" element={<Stub name="Users" />} />
            <Route path="/users/:userId" element={<Stub name="User" />} />
            <Route path="/subscriptions" element={<Stub name="Subscriptions" />} />
            <Route path="/health" element={<Stub name="Health" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify build**

```powershell
cd admin
npm run build
```

Expected: clean.

- [ ] **Step 7: Commit**

```powershell
cd ..
git add admin
git commit -m "feat: admin panel — auth session, typed admin-api client, sign-in + shell"
```

---

### Task 8: Dashboard route (metrics)

**Files:**
- Create: `admin/src/components/StatTile.tsx`, `admin/src/routes/Dashboard.tsx`
- Modify: `admin/src/main.tsx` (swap the Dashboard stub for the real route)

**Interfaces:**
- Consumes: `callAdminApi<Metrics>('metrics')`, `ErrorNote`, types from Task 7.

- [ ] **Step 1: Write StatTile**

`admin/src/components/StatTile.tsx`:

```tsx
export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Write Dashboard**

`admin/src/routes/Dashboard.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { ErrorNote } from '../components/ErrorNote';
import { StatTile } from '../components/StatTile';
import { callAdminApi, type Metrics } from '../lib/api';

function TrendTable({ title, rows }: { title: string; rows: Metrics['signupsByDay'] }) {
  return (
    <section>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <td>{r.day}</td>
              <td>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function Dashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => callAdminApi<Metrics>('metrics'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="tiles">
        <StatTile label="Recruiters" value={data.totals.recruiters} />
        <StatTile label="Active (7d)" value={data.totals.activeLast7d} />
        <StatTile label="Grades" value={data.totals.grades} />
        <StatTile label="Basic" value={data.paidByPlan.basic ?? 0} />
        <StatTile label="Pro" value={data.paidByPlan.pro ?? 0} />
        <StatTile label="Team Pro" value={data.paidByPlan.team_pro ?? 0} />
      </div>
      <div className="row-grids">
        <TrendTable title="Signups (14d)" rows={data.signupsByDay} />
        <TrendTable title="Swipes (14d)" rows={data.swipesByDay} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into main.tsx**

In `admin/src/main.tsx`, add `import { Dashboard } from './routes/Dashboard';` and replace the Dashboard stub line with:

```tsx
            <Route path="/" element={<Dashboard />} />
```

- [ ] **Step 4: Verify build**

```powershell
cd admin
npm run build
```

Expected: clean.

- [ ] **Step 5: Commit**

```powershell
cd ..
git add admin/src
git commit -m "feat: admin panel — dashboard (metrics tiles + 14d trends)"
```

---

### Task 9: Users + UserDetail routes

**Files:**
- Create: `admin/src/components/DataTable.tsx`, `admin/src/routes/Users.tsx`, `admin/src/routes/UserDetail.tsx`
- Modify: `admin/src/main.tsx` (swap the two stubs)

**Interfaces:**
- Consumes: `callAdminApi<{ users: AdminUserRow[] }>('list_users', { search })`, `callAdminApi<UserDetail>('get_user', { userId })`.
- Produces: `DataTable<T>` generic used again in Task 10:

```tsx
interface Column<T> { key: string; header: string; render: (row: T) => ReactNode }
function DataTable<T>(props: {
  columns: Array<Column<T>>;
  rows: T[];
  keyFor: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty: string;
}): ReactNode
```

- [ ] **Step 1: Write DataTable**

`admin/src/components/DataTable.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  keyFor,
  onRowClick,
  empty,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  keyFor: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty: string;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key}>{c.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={keyFor(row)}
            className={onRowClick ? 'clickable' : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Write Users**

`admin/src/routes/Users.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { type AdminUserRow, callAdminApi } from '../lib/api';

export function Users() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data, error, isPending } = useQuery({
    queryKey: ['users', search],
    queryFn: () =>
      callAdminApi<{ users: AdminUserRow[] }>('list_users', { search }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSearch(input.trim());
  }

  return (
    <div>
      <h2>Users</h2>
      <form className="searchbar" onSubmit={onSubmit}>
        <input
          placeholder="Search email or name…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error ? <ErrorNote error={error} /> : null}
      {isPending ? <p className="muted">Loading…</p> : null}
      {data
        ? (
          <DataTable
            columns={[
              { key: 'email', header: 'Email', render: (u) => u.email },
              {
                key: 'name',
                header: 'Name',
                render: (u) => u.displayName ?? '—',
              },
              { key: 'plan', header: 'Plan', render: (u) => u.plan },
              {
                key: 'connections',
                header: 'Connections',
                render: (u) => u.connectionCount,
              },
              {
                key: 'teams',
                header: 'Teams',
                render: (u) => u.teamNames.join(', ') || '—',
              },
              {
                key: 'created',
                header: 'Joined',
                render: (u) => u.createdAt.slice(0, 10),
              },
            ]}
            rows={data.users}
            keyFor={(u) => u.userId}
            onRowClick={(u) => navigate(`/users/${u.userId}`)}
            empty="No users match."
          />
        )
        : null}
    </div>
  );
}
```

- [ ] **Step 3: Write UserDetail**

`admin/src/routes/UserDetail.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { StatTile } from '../components/StatTile';
import { callAdminApi, type UserDetail as UserDetailShape } from '../lib/api';

export function UserDetail() {
  const { userId = '' } = useParams();
  const { data, error, isPending } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => callAdminApi<UserDetailShape>('get_user', { userId }),
    enabled: userId.length > 0,
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;

  return (
    <div>
      <p>
        <Link to="/users">← Users</Link>
      </p>
      <h2>{data.profile.displayName ?? data.user.email}</h2>
      <p className="muted">
        {data.user.email} · joined {data.user.createdAt.slice(0, 10)} · last
        sign-in {data.user.lastSignInAt?.slice(0, 10) ?? 'never'}
        {data.profile.orgName ? ` · ${data.profile.orgName}` : ''}
      </p>
      <div className="tiles">
        <StatTile label="Swipes" value={data.counts.swipes} />
        <StatTile label="Grades" value={data.counts.grades} />
        <StatTile
          label="Plan"
          value={data.subscriptions[0]?.plan ?? 'freelancer'}
        />
      </div>

      <section>
        <h3>Subscriptions</h3>
        <DataTable
          columns={[
            { key: 'plan', header: 'Plan', render: (s) => s.plan },
            { key: 'status', header: 'Status', render: (s) => s.status },
            { key: 'seats', header: 'Seats', render: (s) => s.seats },
            {
              key: 'renews',
              header: 'Renews',
              render: (s) => s.currentPeriodEnd?.slice(0, 10) ?? '—',
            },
            {
              key: 'customer',
              header: 'Stripe customer',
              render: (s) => s.stripeCustomerId,
            },
          ]}
          rows={data.subscriptions}
          keyFor={(s) => `${s.plan}-${s.stripeCustomerId}`}
          empty="No subscription rows (freelancer)."
        />
      </section>

      <section>
        <h3>Connected sources</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (i) => i.provider },
            {
              key: 'label',
              header: 'Label',
              render: (i) => i.displayLabel ?? '—',
            },
            {
              key: 'connected',
              header: 'Connected',
              render: (i) => i.connectedAt.slice(0, 10),
            },
            {
              key: 'shared',
              header: 'Team-shared',
              render: (i) => (i.sharedTeamId ? 'yes' : 'no'),
            },
          ]}
          rows={data.integrations}
          keyFor={(i) => i.id}
          empty="No connected sources."
        />
      </section>

      <section>
        <h3>Teams</h3>
        <DataTable
          columns={[
            { key: 'name', header: 'Team', render: (t) => t.name },
            { key: 'role', header: 'Role', render: (t) => t.role },
          ]}
          rows={data.teams}
          keyFor={(t) => t.teamId}
          empty="No team memberships."
        />
      </section>

      <section>
        <h3>Devices</h3>
        <DataTable
          columns={[
            { key: 'platform', header: 'Platform', render: (d) => d.platform },
            {
              key: 'device',
              header: 'Device',
              render: (d) => d.deviceName ?? '—',
            },
            {
              key: 'seen',
              header: 'Last seen',
              render: (d) => d.lastSeenAt.slice(0, 10),
            },
          ]}
          rows={data.deviceTokens}
          keyFor={(d) => `${d.platform}-${d.deviceName ?? ''}-${d.lastSeenAt}`}
          empty="No registered devices."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire into main.tsx**

Add `import { Users } from './routes/Users';` and `import { UserDetail } from './routes/UserDetail';`, then replace the two stub lines with:

```tsx
            <Route path="/users" element={<Users />} />
            <Route path="/users/:userId" element={<UserDetail />} />
```

- [ ] **Step 5: Verify build**

```powershell
cd admin
npm run build
```

Expected: clean.

- [ ] **Step 6: Commit**

```powershell
cd ..
git add admin/src
git commit -m "feat: admin panel — users list + user detail"
```

---

### Task 10: Subscriptions + Health routes

**Files:**
- Create: `admin/src/routes/Subscriptions.tsx`, `admin/src/routes/Health.tsx`
- Modify: `admin/src/main.tsx` (swap the last two stubs, delete the `Stub` component)

**Interfaces:**
- Consumes: `callAdminApi<{ subscriptions: SubscriptionRow[] }>('list_subscriptions')`, `callAdminApi<Health>('integration_health')`, `DataTable`.

- [ ] **Step 1: Write Subscriptions**

`admin/src/routes/Subscriptions.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { callAdminApi, type SubscriptionRow } from '../lib/api';

export function Subscriptions() {
  const navigate = useNavigate();
  const { data, error, isPending } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () =>
      callAdminApi<{ subscriptions: SubscriptionRow[] }>('list_subscriptions'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;

  return (
    <div>
      <h2>Subscriptions</h2>
      <DataTable
        columns={[
          { key: 'email', header: 'User', render: (s) => s.email },
          { key: 'plan', header: 'Plan', render: (s) => s.plan },
          { key: 'status', header: 'Status', render: (s) => s.status },
          { key: 'seats', header: 'Seats', render: (s) => s.seats },
          {
            key: 'renews',
            header: 'Renews',
            render: (s) => s.currentPeriodEnd?.slice(0, 10) ?? '—',
          },
          {
            key: 'customer',
            header: 'Stripe customer',
            render: (s) => s.stripeCustomerId,
          },
        ]}
        rows={data?.subscriptions ?? []}
        keyFor={(s) => `${s.userId}-${s.plan}`}
        onRowClick={(s) => navigate(`/users/${s.userId}`)}
        empty="No subscriptions yet."
      />
    </div>
  );
}
```

- [ ] **Step 2: Write Health**

`admin/src/routes/Health.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { callAdminApi, type Health as HealthShape } from '../lib/api';

export function Health() {
  const { data, error, isPending } = useQuery({
    queryKey: ['integration-health'],
    queryFn: () => callAdminApi<HealthShape>('integration_health'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;

  return (
    <div>
      <h2>Integration health</h2>

      <section>
        <h3>Connections by provider</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (r) => r.provider },
            { key: 'count', header: 'Connections', render: (r) => r.count },
          ]}
          rows={data.connectionsByProvider}
          keyFor={(r) => r.provider}
          empty="No connected sources."
        />
      </section>

      <section>
        <h3>Swipe-action failures (7d)</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (f) => f.provider },
            { key: 'action', header: 'Action', render: (f) => f.actionType },
            {
              key: 'when',
              header: 'When',
              render: (f) => f.swipedAt.replace('T', ' ').slice(0, 16),
            },
            {
              key: 'detail',
              header: 'Error',
              render: (f) => f.detail ?? '—',
            },
          ]}
          rows={data.recentFailures}
          keyFor={(f) => `${f.swipedAt}-${f.actionType}-${f.provider}`}
          empty="No failures in the last 7 days."
        />
      </section>

      <section>
        <h3>Stale notification topics</h3>
        <p className="muted">
          Enabled topics never scanned, or last scanned over an hour ago (cron
          runs every 15 minutes).
        </p>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (t) => t.provider },
            {
              key: 'req',
              header: 'Requisition',
              render: (t) => t.requisitionExternalId,
            },
            {
              key: 'scanned',
              header: 'Last scanned',
              render: (t) =>
                t.lastScannedAt?.replace('T', ' ').slice(0, 16) ?? 'never',
            },
          ]}
          rows={data.staleTopics}
          keyFor={(t) => t.topicId}
          empty="No stale topics."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Finish main.tsx**

Replace the remaining stubs and remove the `Stub` component. Final `admin/src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './routes/Dashboard';
import { Health } from './routes/Health';
import { SignIn } from './routes/SignIn';
import { Subscriptions } from './routes/Subscriptions';
import { UserDetail } from './routes/UserDetail';
import { Users } from './routes/Users';
import './styles.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/:userId" element={<UserDetail />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/health" element={<Health />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Verify build**

```powershell
cd admin
npm run build
```

Expected: clean.

- [ ] **Step 5: Commit**

```powershell
cd ..
git add admin/src
git commit -m "feat: admin panel — subscriptions + integration health"
```

---

### Task 11: End-to-end verification + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (new dated entry at top, below the header block)

**Interfaces:** none new.

- [ ] **Step 1: Full local test sweep**

```powershell
cd supabase/functions
deno test
deno fmt --check
deno lint
cd ../..
npx supabase db reset
deno test --allow-net --allow-env supabase/tests/rls/isolation.test.ts
deno test --allow-net --allow-env supabase/tests/rls/team-sharing.test.ts
npm run typecheck
npm test
cd admin
npm run build
cd ..
```

Expected: everything green (existing suites unaffected — nothing in this plan touches app code or existing functions).

- [ ] **Step 2: Live smoke test against the LOCAL stack**

Serve the function locally and exercise the gate + one action end-to-end:

```powershell
npx supabase functions serve admin-api --env-file supabase/.env.local
```

(If `supabase/.env.local` doesn't exist, `functions serve` falls back to the local stack's default env — SUPABASE_URL/keys are injected automatically.)

In a second terminal — sign in as the seeded local admin and call metrics. First create a local account matching the allowlist:

```powershell
# One-time: create the founder account on the LOCAL stack so the JWT email
# matches the seeded allowlist row.
npx supabase status   # note the anon key + API URL (127.0.0.1:54321)
```

```powershell
$anon = '<LOCAL_ANON_KEY from supabase status>'
$base = 'http://127.0.0.1:54321'
# create + confirm the user via the local auth admin API (service key from supabase status)
$service = '<LOCAL_SERVICE_ROLE_KEY from supabase status>'
Invoke-WebRequest -Uri "$base/auth/v1/admin/users" -Method POST -Headers @{ apikey = $service; Authorization = "Bearer $service" } -ContentType 'application/json' -Body '{"email":"douglasrich9215@gmail.com","password":"local-test-123!","email_confirm":true}' -UseBasicParsing
# sign in -> access_token
$signin = Invoke-WebRequest -Uri "$base/auth/v1/token?grant_type=password" -Method POST -Headers @{ apikey = $anon } -ContentType 'application/json' -Body '{"email":"douglasrich9215@gmail.com","password":"local-test-123!"}' -UseBasicParsing
$token = (ConvertFrom-Json $signin.Content).access_token
# call admin-api (functions serve listens on 54321 via the gateway)
Invoke-WebRequest -Uri "$base/functions/v1/admin-api" -Method POST -Headers @{ apikey = $anon; Authorization = "Bearer $token" } -ContentType 'application/json' -Body '{"action":"metrics"}' -UseBasicParsing
```

Expected: `200` with a metrics JSON body (zeros are fine on a fresh local DB). Then negative check — a second, non-allowlisted local user gets `403 {"error":"not an admin"}` on the same call.

- [ ] **Step 3: Manual panel check (local)**

```powershell
cd admin
Copy-Item .env.example .env.local
# edit .env.local: point at the LOCAL stack (http://127.0.0.1:54321 + local anon key)
npm run dev
```

Sign in as the local founder account → Dashboard renders tiles; Users/Subscriptions/Health render (empty tables are fine). Sign in as the non-allowlisted user → "This account isn't an admin."

- [ ] **Step 4: CHANGELOG entry**

Add at the top of the dated entries in `CHANGELOG.md`:

```markdown
## 2026-07-12 — Web admin panel (phase 1, read-only)

### Added
- **Admin panel** (`admin/` — Vite + React + TS strict, deployed separately to
  Vercel): sign-in with existing Supabase auth, then Dashboard (signups/swipes
  14d, active-7d, paid-by-plan), Users (+ per-user detail), Subscriptions, and
  Integration health (connections by provider, swipe-action failures 7d, stale
  notification topics). Read-only throughout.
- **`admin-api` edge function** — the panel's only data source. JWT-authed,
  then the caller's email must be in the new `admin_users` allowlist
  (migration `0025`; RLS on with no policies = service-role-only, seeded with
  the founder). Runs read-only queries with the service role; never returns
  credentials or Vault contents. Unknown actions 400; internals never echoed
  (500 = generic). Gate + dispatch are Deno-unit-tested; RLS suite asserts
  admin_users is invisible to authenticated users.
- **`admin_list_auth_users()`** — SECURITY DEFINER helper (service_role-only)
  packaging auth.users (id, email, created_at, last_sign_in_at) for the panel,
  since PostgREST doesn't expose the auth schema.

### Notes
- Phase 2 (mutations: comp plan, manage admins, delete user + audit log) is
  spec'd but deliberately not built — see
  docs/superpowers/specs/2026-07-12-admin-panel-design.md.
- Deploy: `db push` (0025) + `functions deploy admin-api`; panel: Vercel
  project with root dir `admin/`, env VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
```

- [ ] **Step 5: Commit**

```powershell
git add CHANGELOG.md
git commit -m "docs: changelog — admin panel phase 1"
```

---

## Deployment appendix (USER-run, after the plan completes)

1. `npx supabase db push` — applies 0025 (and 0024 if not yet pushed).
2. `npx supabase functions deploy admin-api`.
3. Vercel: import the repo → root directory `admin/` → framework Vite →
   env `VITE_SUPABASE_URL=https://lbhikadtsmbnzkzetpyb.supabase.co`,
   `VITE_SUPABASE_ANON_KEY=<hosted anon key>` → deploy.
4. Sign in with the founder account; hosted smoke: Dashboard tiles show real
   numbers; a non-allowlisted account sees the 403 screen.

## Self-Review Notes

- Spec coverage: allowlist auth (T1/T2/T5), 5 read-only actions (T3-T5), 5 routes + sign-in (T7-T10), never-credentials rule (T4 comment + T5 doc header), error model 401/403/400/500 (T2 tests), Deno gate tests + RLS case (T1/T2), TS-strict-only panel (T6), CHANGELOG (T11). Vercel deploy = user appendix.
- Spec deviation (intentional): executed_actions failure literal is `'failure'` + `descriptor.type`/`message` — matches `src/features/swipes/execute-actions.ts`, which is authoritative over the spec's `'failed'` sketch.
- Type consistency: action names (`metrics`, `list_users`, `get_user`, `list_subscriptions`, `integration_health`) and response shapes are identical in T5 index.ts wiring and T7 `lib/api.ts` types; `DataTable` signature defined in T9 matches T10 usage.
