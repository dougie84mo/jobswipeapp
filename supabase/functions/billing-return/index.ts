// Edge function: billing-return
//
// Stripe success/cancel/portal-return URLs must be https, but the app waits
// on a recruitswipe:// deep link (expo-web-browser openAuthSessionAsync).
// This function is the bridge: Stripe redirects the in-app browser here, and
// this page immediately forwards to the app scheme, which closes the browser
// and returns control to the Subscriptions screen.
//
// No auth (verify_jwt = false in config.toml): it carries no data beyond the
// status flag and touches nothing server-side.

const PAGE = (status: string) => {
  const target = `recruitswipe://billing-return?status=${
    encodeURIComponent(status)
  }`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to Recruit Swipe…</title>
    <meta http-equiv="refresh" content="0;url=${target}" />
  </head>
  <body style="font-family: system-ui; text-align: center; padding-top: 4rem;">
    <p>Returning to Recruit Swipe…</p>
    <p><a href="${target}">Tap here if nothing happens</a></p>
    <script>window.location.href = ${JSON.stringify(target)};</script>
  </body>
</html>`;
};

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'done';
  // Allowlist the flag so nothing attacker-controlled lands in the page.
  const safe = ['success', 'cancelled', 'portal-done', 'done'].includes(status)
    ? status
    : 'done';
  return new Response(PAGE(safe), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
