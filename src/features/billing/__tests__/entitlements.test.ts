import {
  entitlementsFor,
  FREE_CONNECTION_LIMIT,
  type SubscriptionRow,
} from '@/features/billing/entitlements';

function sub(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: 's1',
    user_id: 'u1',
    plan: 'pro',
    status: 'active',
    seats: 1,
    current_period_end: null,
    stripe_customer_id: 'cus_1',
    ...overrides,
  };
}

describe('entitlementsFor', () => {
  it('free plan: first connection allowed, second blocked, no teams', () => {
    const zero = entitlementsFor([], { integrations: 0 });
    expect(zero.plan).toBe('free');
    expect(zero.canAddConnection).toBe(true);
    expect(zero.canCreateTeam).toBe(false);
    expect(zero.hasBillingAccount).toBe(false);

    const atLimit = entitlementsFor([], { integrations: FREE_CONNECTION_LIMIT });
    expect(atLimit.canAddConnection).toBe(false);
  });

  it('pro: unlimited connections, still no team creation', () => {
    const e = entitlementsFor([sub({ plan: 'pro' })], { integrations: 7 });
    expect(e.plan).toBe('pro');
    expect(e.canAddConnection).toBe(true);
    expect(e.canCreateTeam).toBe(false);
  });

  it('team: everything, seats surfaced, wins over pro', () => {
    const e = entitlementsFor(
      [sub({ plan: 'pro' }), sub({ id: 's2', plan: 'team', seats: 5 })],
      { integrations: 3 },
    );
    expect(e.plan).toBe('team');
    expect(e.canAddConnection).toBe(true);
    expect(e.canCreateTeam).toBe(true);
    expect(e.teamSeats).toBe(5);
  });

  it('trialing and past_due count as entitled', () => {
    expect(
      entitlementsFor([sub({ status: 'trialing' })], { integrations: 5 })
        .canAddConnection,
    ).toBe(true);
    expect(
      entitlementsFor([sub({ status: 'past_due' })], { integrations: 5 }).plan,
    ).toBe('pro');
  });

  it('canceled / incomplete / unpaid do NOT entitle, but keep the portal', () => {
    for (const status of ['canceled', 'incomplete', 'unpaid', 'incomplete_expired']) {
      const e = entitlementsFor([sub({ status })], { integrations: 1 });
      expect(e.plan).toBe('free');
      expect(e.canAddConnection).toBe(false);
      expect(e.hasBillingAccount).toBe(true); // Manage billing stays reachable
    }
  });

  it('an expired team plan removes team creation but pro can survive', () => {
    const e = entitlementsFor(
      [
        sub({ plan: 'team', status: 'canceled', seats: 5 }),
        sub({ id: 's2', plan: 'pro', status: 'active' }),
      ],
      { integrations: 2 },
    );
    expect(e.plan).toBe('pro');
    expect(e.canCreateTeam).toBe(false);
    expect(e.teamSeats).toBe(0);
  });
});
