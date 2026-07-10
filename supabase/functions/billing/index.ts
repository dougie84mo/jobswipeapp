// Edge function: billing
//
// JWT-authenticated (same model as ats-proxy): the mobile app calls this to
// start Stripe flows; Stripe secrets never touch the device.
//
// Actions (POST JSON):
//   { "action": "checkout", "plan": "basic" | "pro" | "team_pro", "seats"?: number }
//     → { url } — a Stripe-hosted Checkout page. The app opens it with
//       expo-web-browser and waits for the recruitswipe:// return.
//   { "action": "portal" }
//     → { url } — the Stripe Billing Portal (manage / cancel / add seats).
//
// Seat billing: `pro` checks out as TWO line items — the base price (which
// includes seat 1) at quantity 1, plus the extra-seat price at quantity
// seats-1, omitted entirely when seats == 1. `basic` and `team_pro` are flat
// single-line prices; team_pro's 10 seats are a plan constant, not a quantity.
//
// Stripe redirect URLs must be https, so success/cancel/return all point at
// the billing-return edge function, which serves a page that bounces to the
// recruitswipe://billing-return deep link (closing the in-app browser).
//
// Secrets (npx supabase secrets set):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO,
//   STRIPE_PRICE_PRO_SEAT, STRIPE_PRICE_TEAM_PRO
//
// Subscription state lands in public.subscriptions via the stripe-webhook
// function — this function never writes rows.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=denonext';

type PaidPlan = 'basic' | 'pro' | 'team_pro';

/** Mirrors PLAN_INCLUDED_SEATS.team_pro in src/features/billing/entitlements.ts. */
const TEAM_PRO_SEATS = 10;

/** Upper bound on pro seats bought at checkout; the portal can go higher. */
const MAX_PRO_SEATS = 50;

interface RequestBody {
  action: 'checkout' | 'portal';
  plan?: PaidPlan;
  seats?: number;
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return jsonResponse({ error: 'missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const priceBasic = Deno.env.get('STRIPE_PRICE_BASIC');
  const pricePro = Deno.env.get('STRIPE_PRICE_PRO');
  const priceProSeat = Deno.env.get('STRIPE_PRICE_PRO_SEAT');
  const priceTeamPro = Deno.env.get('STRIPE_PRICE_TEAM_PRO');
  if (!supabaseUrl || !anonKey || !stripeKey) {
    return jsonResponse({ error: 'billing not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'invalid token' }, 401);
  }
  const user = userData.user;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  const stripe = new Stripe(stripeKey, {
    // Deno-compatible transport + crypto.
    httpClient: Stripe.createFetchHttpClient(),
  });

  // The https bounce page that forwards to recruitswipe://billing-return.
  const returnUrl = `${supabaseUrl}/functions/v1/billing-return`;

  // Reuse the customer recorded by a prior subscription; RLS returns only
  // the caller's own rows under their JWT.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle<{ stripe_customer_id: string }>();

  try {
    if (body.action === 'portal') {
      if (!existing?.stripe_customer_id) {
        return jsonResponse({ error: 'no billing account yet' }, 400);
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: existing.stripe_customer_id,
        return_url: `${returnUrl}?status=portal-done`,
      });
      return jsonResponse({ url: session.url });
    }

    if (body.action === 'checkout') {
      const plan = body.plan;
      if (plan !== 'basic' && plan !== 'pro' && plan !== 'team_pro') {
        return jsonResponse(
          { error: 'plan must be basic, pro or team_pro' },
          400,
        );
      }

      const basePrice = plan === 'basic'
        ? priceBasic
        : plan === 'pro'
        ? pricePro
        : priceTeamPro;
      if (!basePrice) {
        return jsonResponse({ error: `price for ${plan} not configured` }, 500);
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        { price: basePrice, quantity: 1 },
      ];

      // Pro's base price includes seat 1; anything beyond that is a second
      // line item so the invoice reads $20 + N x $15 rather than N x $20.
      let seats = plan === 'team_pro' ? TEAM_PRO_SEATS : 1;
      if (plan === 'pro') {
        seats = Math.max(
          1,
          Math.min(MAX_PRO_SEATS, Math.floor(body.seats ?? 1)),
        );
        if (seats > 1) {
          if (!priceProSeat) {
            return jsonResponse(
              { error: 'price for pro seats not configured' },
              500,
            );
          }
          lineItems.push({ price: priceProSeat, quantity: seats - 1 });
        }
      }

      let customerId = existing?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        line_items: lineItems,
        // user_id rides on the subscription so every webhook event can map
        // back to the recruiter without extra lookups.
        subscription_data: { metadata: { user_id: user.id, plan } },
        success_url: `${returnUrl}?status=success`,
        cancel_url: `${returnUrl}?status=cancelled`,
        allow_promotion_codes: true,
      });
      return jsonResponse({ url: session.url });
    }

    return jsonResponse(
      { error: `unknown action ${String(body.action)}` },
      400,
    );
  } catch (err) {
    // Never echo Stripe error payloads verbatim — they can carry account
    // details. Message text is enough to diagnose.
    const message = err instanceof Error ? err.message : 'Stripe call failed';
    return jsonResponse({ error: message }, 502);
  }
});
