// Edge function: ats-proxy
//
// The mobile app calls this function instead of hitting any ATS API directly.
// Decrypts credentials from `integrations.credentials_encrypted`, dispatches
// to the right adapter, returns normalized data.
//
// Wire-up happens in phase 4. This file is a stub so the directory exists
// and `supabase functions deploy ats-proxy` doesn't 404.

// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";

serve((_req: Request) => {
  return new Response(
    JSON.stringify({ error: "ats-proxy not yet implemented" }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
