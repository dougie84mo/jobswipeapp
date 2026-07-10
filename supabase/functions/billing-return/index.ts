// Edge function: billing-return
//
// Stripe success/cancel/portal-return URLs must be https, but the app waits
// on a recruitswipe:// deep link (expo-web-browser openAuthSessionAsync).
// This function is the bridge: Stripe redirects the in-app browser here, and
// a 302 forwards straight to the app scheme, which closes the browser and
// returns control to the Subscriptions screen.
//
// A 302 — not an HTML bounce page — because the Supabase gateway rewrites
// HTML responses on *.supabase.co to text/plain with a sandboxing CSP
// (anti-phishing), so a meta-refresh/script page never renders. The in-app
// browser follows custom-scheme redirects natively (it's the standard OAuth
// return pattern).
//
// No auth (verify_jwt = false in config.toml): it carries no data beyond the
// status flag and touches nothing server-side.

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'done';
  // Allowlist the flag so nothing attacker-controlled lands in the redirect.
  const safe = ['success', 'cancelled', 'portal-done', 'done'].includes(status)
    ? status
    : 'done';
  const target = `recruitswipe://billing-return?status=${
    encodeURIComponent(safe)
  }`;
  return new Response(`Returning to Recruit Swipe… ${target}`, {
    status: 302,
    headers: { Location: target },
  });
});
