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

export {
  bucketByDay,
  ENTITLED,
  firstError,
  isoDaysAgo,
  listAuthUsers,
  PLAN_RANK,
};
export type { AuthUserRow, DB };
