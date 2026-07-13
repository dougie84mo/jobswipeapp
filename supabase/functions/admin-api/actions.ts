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

async function listAuthUsers(
  admin: SupabaseClient<DB>,
): Promise<AuthUserRow[]> {
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
    buckets.set(
      new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10),
      0,
    );
  }
  for (const iso of isoDates) {
    if (!iso) continue;
    const day = iso.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([day, count]) => ({ day, count }));
}

/** Throw on the first PostgREST error in a batch of results. */
function firstError(
  results: Array<{ error: { message: string } | null }>,
): void {
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
    ((tokens.data ?? []) as unknown as Array<{ user_id: string }>).map((t) =>
      t.user_id
    ),
  );
  const since7Ms = Date.parse(since7);
  for (const u of authUsers) {
    if (u.last_sign_in_at && Date.parse(u.last_sign_in_at) >= since7Ms) {
      activeUserIds.add(u.user_id);
    }
  }

  const paidByPlan: Record<string, number> = { basic: 0, pro: 0, team_pro: 0 };
  for (
    const s of (subs.data ?? []) as unknown as Array<{
      plan: string;
      status: string;
    }>
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
      ((swipes.data ?? []) as unknown as Array<{ created_at: string }>).map(
        (s) => s.created_at,
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
    subscriptions: ((subs.data ?? []) as unknown as SubRow[]).map((s) => ({
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
    const i of (integrations.data ?? []) as unknown as Array<
      { user_id: string }
    >
  ) {
    connectionCounts.set(i.user_id, (connectionCounts.get(i.user_id) ?? 0) + 1);
  }

  const planByUser = new Map<string, string>();
  for (
    const s of (subs.data ?? []) as unknown as Array<
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
    const m of (memberships.data ?? []) as unknown as Array<
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
  const users = ((profiles.data ?? []) as unknown as ProfileRow[])
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
  firstError([
    profile,
    subs,
    integrations,
    memberships,
    tokens,
    swipeCount,
    gradeCount,
  ]);

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

  const profileRow = profile.data as unknown as (
    | { display_name: string | null; org_name: string | null }
    | null
  );

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
    subscriptions: ((subs.data ?? []) as unknown as SubRow[]).map((s) => ({
      plan: s.plan,
      status: s.status,
      seats: s.seats,
      currentPeriodEnd: s.current_period_end,
      stripeCustomerId: s.stripe_customer_id,
    })),
    integrations: ((integrations.data ?? []) as unknown as IntegrationRow[])
      .map((i) => ({
        id: i.id,
        provider: i.provider,
        displayLabel: i.display_label,
        connectedAt: i.connected_at,
        sharedTeamId: i.shared_team_id,
      })),
    teams: ((memberships.data ?? []) as unknown as MembershipRow[]).map(
      (m) => ({
        teamId: m.team_id,
        name: m.teams?.name ?? '',
        role: m.role,
      }),
    ),
    deviceTokens: ((tokens.data ?? []) as unknown as TokenRow[]).map((t) => ({
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

export {
  bucketByDay,
  ENTITLED,
  firstError,
  isoDaysAgo,
  listAuthUsers,
  PLAN_RANK,
};
export type { AuthUserRow, DB };
