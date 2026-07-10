// Plan entitlements — pure logic, exhaustively Jest-tested. The server
// enforces the same rules in SECURITY DEFINER RPCs (0023: create_integration
// caps connections via connection_limit_for, create_team requires pro or
// team_pro, invite_to_team enforces seats); this module drives the UI gates
// and copy.

/** Freelancer is the absence of an entitled subscription row, not a Stripe plan. */
export type PlanId = 'freelancer' | 'basic' | 'pro' | 'team_pro';

/** Plans that exist as Stripe subscriptions (i.e. everything but freelancer). */
export type PaidPlanId = Exclude<PlanId, 'freelancer'>;

/** Stripe statuses that count as entitled (past_due = payment-retry grace). */
export const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'] as const;

/** Connected-source ceiling per plan. null = unlimited. */
export const PLAN_CONNECTION_LIMIT: Record<PlanId, number | null> = {
  freelancer: 1,
  basic: 2,
  pro: 5,
  team_pro: null,
};

/** Seats included in the plan's base price. Extra pro seats are billed per-seat. */
export const PLAN_INCLUDED_SEATS: Record<PlanId, number> = {
  freelancer: 1,
  basic: 1,
  pro: 1,
  team_pro: 10,
};

/** Plans that can create a team and invite into seats. */
export const TEAM_CAPABLE_PLANS: readonly PlanId[] = ['pro', 'team_pro'];

/** Cheapest-to-richest. Index doubles as the rank for upgrade comparisons. */
export const PLAN_ORDER: readonly PlanId[] = [
  'freelancer',
  'basic',
  'pro',
  'team_pro',
];

/** True when `candidate` sits above `current` in PLAN_ORDER. */
export function isUpgrade(candidate: PlanId, current: PlanId): boolean {
  return PLAN_ORDER.indexOf(candidate) > PLAN_ORDER.indexOf(current);
}

/** Highest-to-lowest, so the entitled plan is the first match. */
const PLAN_RANK: readonly PaidPlanId[] = ['team_pro', 'pro', 'basic'];

export const PLAN_LABEL: Record<PlanId, string> = {
  freelancer: 'Freelancer',
  basic: 'Basic',
  pro: 'Pro',
  team_pro: 'Team Pro',
};

export const PLAN_PRICE_LABEL: Record<PlanId, string> = {
  freelancer: 'Free',
  basic: '$5/mo',
  pro: '$20/mo + $15/seat',
  team_pro: '$100/mo',
};

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: PaidPlanId;
  status: string;
  seats: number;
  current_period_end: string | null;
  stripe_customer_id: string;
}

export interface Entitlements {
  /** Highest entitled plan (team_pro > pro > basic > freelancer). */
  plan: PlanId;
  canAddConnection: boolean;
  canCreateTeam: boolean;
  /** Connected-source ceiling for the entitled plan. null = unlimited. */
  connectionLimit: number | null;
  /** Seats on the entitled plan (freelancer/basic are single-seat). */
  seats: number;
  /** True when the user has ever had a Stripe customer (portal available). */
  hasBillingAccount: boolean;
}

function isEntitled(sub: SubscriptionRow): boolean {
  return (ENTITLED_STATUSES as readonly string[]).includes(sub.status);
}

/**
 * Compute entitlements from the user's OWN subscription rows (the
 * subscriptions query may also return team-owners' rows for display — filter
 * before calling) and their current connection count.
 */
export function entitlementsFor(
  ownSubscriptions: SubscriptionRow[],
  counts: { integrations: number },
): Entitlements {
  const entitled = ownSubscriptions.filter(isEntitled);
  const active = PLAN_RANK.map((p) => entitled.find((s) => s.plan === p)).find(
    (s): s is SubscriptionRow => s !== undefined,
  );
  const plan: PlanId = active?.plan ?? 'freelancer';
  const connectionLimit = PLAN_CONNECTION_LIMIT[plan];

  // team_pro seats are fixed by the plan; pro seats are whatever quantity the
  // extra-seat line item carries (the webhook already folded in the base seat).
  const seats = plan === 'team_pro'
    ? PLAN_INCLUDED_SEATS.team_pro
    : (active?.seats ?? PLAN_INCLUDED_SEATS[plan]);

  return {
    plan,
    canAddConnection:
      connectionLimit === null || counts.integrations < connectionLimit,
    canCreateTeam: TEAM_CAPABLE_PLANS.includes(plan),
    connectionLimit,
    seats,
    hasBillingAccount: ownSubscriptions.length > 0,
  };
}
