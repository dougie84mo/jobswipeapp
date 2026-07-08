// Plan entitlements — pure logic, exhaustively Jest-tested. The server
// enforces the same rules in SECURITY DEFINER RPCs (0021: create_integration
// requires pro/team past the first connection, create_team requires team,
// invite_to_team enforces seats); this module drives the UI gates and copy.

export type PlanId = 'free' | 'pro' | 'team';

/** Stripe statuses that count as entitled (past_due = payment-retry grace). */
export const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'] as const;

/** Free-plan ceiling on connected sources. */
export const FREE_CONNECTION_LIMIT = 1;

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: 'pro' | 'team';
  status: string;
  seats: number;
  current_period_end: string | null;
  stripe_customer_id: string;
}

export interface Entitlements {
  /** Highest entitled plan (team > pro > free). */
  plan: PlanId;
  canAddConnection: boolean;
  canCreateTeam: boolean;
  /** Seats on the entitled team plan (0 when none). */
  teamSeats: number;
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
  const team = entitled.find((s) => s.plan === 'team');
  const pro = entitled.find((s) => s.plan === 'pro');
  const plan: PlanId = team ? 'team' : pro ? 'pro' : 'free';
  return {
    plan,
    canAddConnection:
      plan !== 'free' || counts.integrations < FREE_CONNECTION_LIMIT,
    canCreateTeam: Boolean(team),
    teamSeats: team?.seats ?? 0,
    hasBillingAccount: ownSubscriptions.length > 0,
  };
}
