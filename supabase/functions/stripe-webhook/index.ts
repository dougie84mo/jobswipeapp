// Edge function: stripe-webhook
//
// Stripe → Postgres sync. The ONLY writer of public.subscriptions.
//
// Auth model: no JWT (verify_jwt = false in config.toml) — Stripe can't send
// one. Every request is authenticated by verifying the Stripe-Signature
// header against STRIPE_WEBHOOK_SECRET (constructEventAsync + SubtleCrypto,
// the Deno-compatible path). Rows are written with the service role.
//
// Handled events:
//   checkout.session.completed        → fetch the subscription, upsert
//   customer.subscription.updated     → upsert (status/seats/period changes)
//   customer.subscription.deleted     → status 'canceled'
//
// user_id comes from subscription.metadata (set by the billing function at
// checkout). plan maps from the price ids on the subscription's items, with
// metadata.plan as fallback.
//
// Seats: a `pro` subscription carries TWO items — the base price (seat 1) and
// the extra-seat price (quantity = seats - 1) — so seats is computed, not read
// off a single quantity. `team_pro` seats are a plan constant. See the billing
// function's checkout branch.
//
// Register in the Stripe dashboard:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

type PaidPlan = 'basic' | 'pro' | 'team_pro';

/** Mirrors PLAN_INCLUDED_SEATS.team_pro in src/features/billing/entitlements.ts. */
const TEAM_PRO_SEATS = 10;

function isPaidPlan(value: string | undefined): value is PaidPlan {
  return value === 'basic' || value === 'pro' || value === 'team_pro';
}

/**
 * Resolve plan + seats from the subscription's line items. Price ids win over
 * metadata; metadata.plan is the fallback when price ids get rotated.
 */
// deno-lint-ignore no-explicit-any
function resolvePlan(sub: any): { plan: PaidPlan; seats: number } | null {
  // deno-lint-ignore no-explicit-any
  const items: any[] = sub.items?.data ?? [];
  const qtyOf = (priceId: string | undefined): number => {
    if (!priceId) return 0;
    const item = items.find((i) => i?.price?.id === priceId);
    return item ? (item.quantity ?? 0) : 0;
  };

  const basic = Deno.env.get('STRIPE_PRICE_BASIC');
  const pro = Deno.env.get('STRIPE_PRICE_PRO');
  const proSeat = Deno.env.get('STRIPE_PRICE_PRO_SEAT');
  const teamPro = Deno.env.get('STRIPE_PRICE_TEAM_PRO');

  if (qtyOf(teamPro) > 0) return { plan: 'team_pro', seats: TEAM_PRO_SEATS };
  // Base price includes seat 1; the extra-seat item carries the rest.
  if (qtyOf(pro) > 0) return { plan: 'pro', seats: 1 + qtyOf(proSeat) };
  if (qtyOf(basic) > 0) return { plan: 'basic', seats: 1 };

  const fallback = sub.metadata?.plan as string | undefined;
  if (isPaidPlan(fallback)) {
    return {
      plan: fallback,
      seats: fallback === 'team_pro'
        ? TEAM_PRO_SEATS
        : (items[0]?.quantity ?? 1),
    };
  }
  return null;
}

// deno-lint-ignore no-explicit-any
async function upsertSubscription(sub: any): Promise<string | null> {
  const userId = sub?.metadata?.user_id as string | undefined;
  if (!userId) return 'subscription has no metadata.user_id';

  const item = sub.items?.data?.[0];
  const resolved = resolvePlan(sub);
  if (!resolved) return `unmapped price ${item?.price?.id ?? 'unknown'}`;
  const { plan, seats } = resolved;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      seats,
      current_period_end: typeof periodEnd === 'number'
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
  return error ? error.message : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret || !stripeKey) {
    return new Response('webhook not configured', { status: 500 });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response('missing signature', { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bad signature';
    return new Response(`signature verification failed: ${message}`, {
      status: 400,
    });
  }

  let problem: string | null = null;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          String(session.subscription),
        );
        problem = await upsertSubscription(sub);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // 'deleted' arrives with status 'canceled' on the object — the same
      // upsert records it and the entitlement check stops matching.
      problem = await upsertSubscription(event.data.object);
      break;
    }
    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break;
  }

  if (problem) {
    // 500 → Stripe retries with backoff; the log line carries the reason.
    console.error(`stripe-webhook: ${event.type}: ${problem}`);
    return new Response(problem, { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
