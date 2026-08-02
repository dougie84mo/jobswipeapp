// RLS test: public.website_leads is invisible to every client role.
//
// The table (0024) is written only by the `website-lead` edge function under
// the service role, and it holds enquiries from anonymous visitors — including
// their email addresses. RLS is enabled with NO policies, which should deny
// anon and authenticated clients outright. This asserts that, so a later
// migration cannot quietly add a permissive policy without a test failing.
//
// Runs against a local stack:
//   supabase start
//   deno test --allow-net --allow-env supabase/tests/rls/website-leads.test.ts

// deno-lint-ignore-file no-explicit-any
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.46.0";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

type DB = any;

const URL = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const PASSWORD = "test-password-123!";

function anonClient(accessToken?: string): SupabaseClient<DB> {
  return createClient<DB>(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

Deno.test("website_leads is hidden from anon and authenticated clients", async () => {
  const service = createClient<DB>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const seededEmail = `lead-${stamp}@example.com`;

  // The edge function writes with the service role; do the same here.
  const { data: seeded, error: seedError } = await service
    .from("website_leads")
    .insert({
      kind: "contact",
      email: seededEmail,
      name: "Seeded Lead",
      fields: { message: "hello" },
    })
    .select("id")
    .single();
  assertEquals(seedError, null);
  assert(seeded?.id);

  // A signed-in recruiter, to prove authentication does not help.
  const email = `rls-leads-${stamp}@example.com`;
  const { data: created, error: createError } = await service.auth.admin
    .createUser({ email, password: PASSWORD, email_confirm: true });
  assertEquals(createError, null);
  assert(created?.user?.id);

  const { data: session, error: signInError } = await anonClient().auth
    .signInWithPassword({ email, password: PASSWORD });
  assertEquals(signInError, null);
  const token = session?.session?.access_token;
  assert(token);

  try {
    for (const [label, client] of [
      ["anon", anonClient()],
      ["authenticated", anonClient(token)],
    ] as const) {
      const { data: rows } = await client
        .from("website_leads")
        .select("id, email");
      assertEquals(
        rows?.length ?? 0,
        0,
        `${label} client could read website_leads`,
      );

      const { error: insertError } = await client
        .from("website_leads")
        .insert({ kind: "contact", email: `spoof-${stamp}@example.com` });
      assert(insertError, `${label} client could insert into website_leads`);

      const { data: updated } = await client
        .from("website_leads")
        .update({ name: "tampered" })
        .eq("id", seeded.id)
        .select("id");
      assertEquals(
        updated?.length ?? 0,
        0,
        `${label} client could update website_leads`,
      );

      const { data: deleted } = await client
        .from("website_leads")
        .delete()
        .eq("id", seeded.id)
        .select("id");
      assertEquals(
        deleted?.length ?? 0,
        0,
        `${label} client could delete website_leads`,
      );
    }
  } finally {
    await service.from("website_leads").delete().eq("id", seeded.id);
    await service.auth.admin.deleteUser(created.user.id);
  }
});
