import {
  entitlementsFor,
  isUpgrade,
  PLAN_CONNECTION_LIMIT,
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
  it('freelancer: one connection, no teams, no billing account', () => {
    const zero = entitlementsFor([], { integrations: 0 });
    expect(zero.plan).toBe('freelancer');
    expect(zero.canAddConnection).toBe(true);
    expect(zero.canCreateTeam).toBe(false);
    expect(zero.connectionLimit).toBe(1);
    expect(zero.hasBillingAccount).toBe(false);

    const atLimit = entitlementsFor([], {
      integrations: PLAN_CONNECTION_LIMIT.freelancer as number,
    });
    expect(atLimit.canAddConnection).toBe(false);
  });

  it('basic: two connections, still no teams', () => {
    const under = entitlementsFor([sub({ plan: 'basic' })], { integrations: 1 });
    expect(under.plan).toBe('basic');
    expect(under.canAddConnection).toBe(true);
    expect(under.canCreateTeam).toBe(false);
    expect(under.connectionLimit).toBe(2);

    const atLimit = entitlementsFor([sub({ plan: 'basic' })], { integrations: 2 });
    expect(atLimit.canAddConnection).toBe(false);
  });

  it('pro: five connections, teams, seats come off the row', () => {
    const e = entitlementsFor([sub({ plan: 'pro', seats: 3 })], { integrations: 4 });
    expect(e.plan).toBe('pro');
    expect(e.canAddConnection).toBe(true);
    expect(e.canCreateTeam).toBe(true);
    expect(e.seats).toBe(3);

    const atLimit = entitlementsFor([sub({ plan: 'pro' })], { integrations: 5 });
    expect(atLimit.canAddConnection).toBe(false);
  });

  it('team_pro: unlimited connections, 10 seats, wins over lower plans', () => {
    const e = entitlementsFor(
      [sub({ plan: 'pro' }), sub({ id: 's2', plan: 'team_pro', seats: 10 })],
      { integrations: 99 },
    );
    expect(e.plan).toBe('team_pro');
    expect(e.canAddConnection).toBe(true);
    expect(e.canCreateTeam).toBe(true);
    expect(e.connectionLimit).toBeNull();
    expect(e.seats).toBe(10);
  });

  it('team_pro seats are a plan constant, not whatever the row says', () => {
    const e = entitlementsFor([sub({ plan: 'team_pro', seats: 1 })], {
      integrations: 0,
    });
    expect(e.seats).toBe(10);
  });

  it('trialing and past_due count as entitled', () => {
    expect(
      entitlementsFor([sub({ status: 'trialing' })], { integrations: 4 })
        .canAddConnection,
    ).toBe(true);
    expect(
      entitlementsFor([sub({ status: 'past_due' })], { integrations: 4 }).plan,
    ).toBe('pro');
  });

  it('canceled / incomplete / unpaid do NOT entitle, but keep the portal', () => {
    for (const status of ['canceled', 'incomplete', 'unpaid', 'incomplete_expired']) {
      const e = entitlementsFor([sub({ status })], { integrations: 1 });
      expect(e.plan).toBe('freelancer');
      expect(e.canAddConnection).toBe(false); // freelancer cap is 1
      expect(e.hasBillingAccount).toBe(true); // Manage billing stays reachable
    }
  });

  it('an expired team_pro plan falls back to a still-active pro', () => {
    const e = entitlementsFor(
      [
        sub({ plan: 'team_pro', status: 'canceled', seats: 10 }),
        sub({ id: 's2', plan: 'pro', status: 'active', seats: 2 }),
      ],
      { integrations: 2 },
    );
    expect(e.plan).toBe('pro');
    expect(e.canCreateTeam).toBe(true);
    expect(e.connectionLimit).toBe(5);
    expect(e.seats).toBe(2);
  });
});

describe('isUpgrade', () => {
  it('orders freelancer < basic < pro < team_pro', () => {
    expect(isUpgrade('basic', 'freelancer')).toBe(true);
    expect(isUpgrade('team_pro', 'pro')).toBe(true);
    expect(isUpgrade('pro', 'pro')).toBe(false);
    expect(isUpgrade('basic', 'pro')).toBe(false);
  });
});
