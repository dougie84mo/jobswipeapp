// Edge function: ats-oauth-callback
//
// OAuth providers redirect here after the recruiter authorizes the app.
// Exchanges the authorization code for tokens, encrypts them with pgsodium,
// writes them to `integrations.credentials_encrypted`, then redirects the
// recruiter back into the mobile app via the configured scheme.
//
// Wire-up happens in phase 4-5 (per-provider OAuth in the Greenhouse/Lever PRs).

// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";

serve((_req: Request) => {
  return new Response(
    JSON.stringify({ error: "ats-oauth-callback not yet implemented" }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
