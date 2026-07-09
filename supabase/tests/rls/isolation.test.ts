// RLS cross-user isolation test.
//
// Asserts that user B can neither read nor write user A's rows across every
// user-scoped table — covering both RLS patterns in 0001_init.sql: direct
// user_id (integrations, swipes) and the join-through-integrations subquery
// (integration_settings, requisitions, candidates).
//
// Runs against a local stack:
//   supabase start
//   deno test --allow-net --allow-env supabase/tests/rls/isolation.test.ts
//
// URL / keys come from env (SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY) and fall back to the Supabase CLI's well-known
// local-dev defaults (public, identical on every local install).

// deno-lint-ignore-file no-explicit-any
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.46.0";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// No generated Database types here, so use a permissive schema generic — it
// keeps the query builder from inferring "Invalid Relationships" error types
// on untyped tables (this test only reads ids and a label).
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

async function createUser(
  service: SupabaseClient<DB>,
  email: string,
): Promise<string> {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message}`);
  }
  return data.user.id;
}

async function signIn(email: string): Promise<string> {
  const { data, error } = await anonClient().auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`signIn failed: ${error?.message}`);
  }
  return data.session.access_token;
}

Deno.test("RLS: user B cannot read or write user A data", async () => {
  const service = createClient<DB>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Unique emails per run so a crashed prior run can't collide.
  const emailA = `rls-a-${crypto.randomUUID()}@example.test`;
  const emailB = `rls-b-${crypto.randomUUID()}@example.test`;
  let userA = "";
  let userB = "";

  try {
    userA = await createUser(service, emailA);
    userB = await createUser(service, emailB);
    const tokenA = await signIn(emailA);
    const tokenB = await signIn(emailB);
    const A = anonClient(tokenA);
    const B = anonClient(tokenB);

    // --- Seed A's data ----------------------------------------------------
    // create_integration runs as A (SECURITY DEFINER, auth.uid() = A) and
    // writes the credential to Vault.
    const { data: integrationId, error: ciErr } = await A.rpc(
      "create_integration",
      {
        p_provider: "greenhouse",
        p_display_label: "A-owned",
        p_credentials: "secret-key",
        p_on_behalf_of_user_id: "999",
        p_extras: {},
      },
    );
    if (ciErr) throw new Error(`create_integration failed: ${ciErr.message}`);

    // Child rows seeded via service role (bypasses RLS) so the test is exactly
    // about B's access, not about A's write path.
    const { data: req, error: reqErr } = await service
      .from("requisitions")
      .insert({
        integration_id: integrationId,
        external_id: "req-1",
        title: "A Req",
      })
      .select("id")
      .single() as any;
    if (reqErr) throw new Error(`seed requisition: ${reqErr.message}`);

    const { data: cand, error: candErr } = await service
      .from("candidates")
      .insert({
        integration_id: integrationId,
        requisition_id: req.id,
        external_id: "cand-1",
        full_name: "A Candidate",
      })
      .select("id")
      .single() as any;
    if (candErr) throw new Error(`seed candidate: ${candErr.message}`);

    const { data: swipe, error: swErr } = await service
      .from("swipes")
      .insert({
        user_id: userA,
        candidate_id: cand.id,
        requisition_id: req.id,
        direction: "right",
      })
      .select("id")
      .single() as any;
    if (swErr) throw new Error(`seed swipe: ${swErr.message}`);

    const { error: setErr } = await service
      .from("integration_settings")
      .insert({
        integration_id: integrationId,
        direction: "right",
        actions: [],
        user_id: userA, // required since 0020 (per-member settings)
      });
    if (setErr) throw new Error(`seed integration_settings: ${setErr.message}`);

    const { error: topicErr } = await service
      .from("notification_topics")
      .insert({
        user_id: userA,
        integration_id: integrationId,
        requisition_external_id: "req-1",
        enabled: true,
      });
    if (topicErr) throw new Error(`seed notification_topics: ${topicErr.message}`);

    const { error: filtErr } = await service
      .from("requisition_filters")
      .insert({
        user_id: userA,
        integration_id: integrationId,
        requisition_external_id: "req-1",
        filters: { hasResume: true },
      });
    if (filtErr) throw new Error(`seed requisition_filters: ${filtErr.message}`);

    const { error: gradeErr } = await service
      .from("candidate_grades")
      .insert({
        user_id: userA,
        integration_id: integrationId,
        requisition_external_id: "req-1",
        candidate_external_id: "cand-1",
        grade: 88,
        detail_grades: { skills: { React: 90 } },
      });
    if (gradeErr) throw new Error(`seed candidate_grades: ${gradeErr.message}`);

    // --- Sanity: A sees its own data --------------------------------------
    assertEquals((await A.from("integrations").select("id")).data?.length, 1);
    assertEquals((await A.from("requisitions").select("id")).data?.length, 1);
    assertEquals((await A.from("candidates").select("id")).data?.length, 1);
    assertEquals((await A.from("swipes").select("id")).data?.length, 1);
    assertEquals(
      (await A.from("integration_settings").select("id")).data?.length,
      1,
    );
    assertEquals(
      (await A.from("notification_topics").select("id")).data?.length,
      1,
    );
    assertEquals(
      (await A.from("requisition_filters").select("id")).data?.length,
      1,
    );
    assertEquals(
      (await A.from("candidate_grades").select("id")).data?.length,
      1,
    );

    // --- B is fully walled off (SELECT returns nothing) -------------------
    for (
      const table of [
        "integrations",
        "requisitions",
        "candidates",
        "swipes",
        "integration_settings",
        "notification_topics",
        "requisition_filters",
        "candidate_grades",
      ]
    ) {
      const { data, error } = await B.from(table).select("id");
      assertEquals(error, null, `${table}: unexpected select error`);
      assertEquals(data?.length, 0, `${table}: B must see none of A's rows`);
    }

    // Even targeting A's row id directly returns nothing.
    assertEquals(
      (await B.from("integrations").select("id").eq("id", integrationId)).data
        ?.length,
      0,
    );

    // --- B cannot mutate A's rows -----------------------------------------
    // UPDATE: RLS filters the row out, so zero rows change.
    const upd = await B.from("integrations")
      .update({ display_label: "hacked" })
      .eq("id", integrationId)
      .select("id");
    assertEquals(upd.data?.length, 0, "B must not update A integration");
    const aCheck = await A.from("integrations")
      .select("display_label")
      .eq("id", integrationId)
      .single() as any;
    assertEquals(
      aCheck.data?.display_label,
      "A-owned",
      "A's row must be untouched",
    );

    // DELETE: RLS filters the row out, so zero rows delete.
    const del = await B.from("swipes").delete().eq("id", swipe.id).select("id");
    assertEquals(del.data?.length, 0, "B must not delete A swipe");
    assertEquals(
      (await A.from("swipes").select("id").eq("id", swipe.id)).data?.length,
      1,
      "A's swipe must survive",
    );

    // INSERT into A's integration via the join-through table is rejected by
    // the WITH CHECK policy.
    const ins = await B.from("integration_settings")
      .insert({ integration_id: integrationId, direction: "left", actions: [] })
      .select("id");
    assert(
      ins.error !== null,
      "B must not insert settings under A integration",
    );

    // The filters RPC verifies integration ownership before writing.
    const rf = await B.rpc("set_requisition_filters", {
      p_integration_id: integrationId,
      p_requisition_external_id: "req-1",
      p_filters: {},
    });
    assert(
      rf.error !== null,
      "B must not set requisition filters under A integration",
    );

    // The grade RPC verifies integration access before writing.
    const gr = await B.rpc("set_candidate_grade", {
      p_integration_id: integrationId,
      p_requisition_external_id: "req-1",
      p_candidate_external_id: "cand-1",
      p_grade: 10,
      p_detail_grades: {},
      p_note: null,
    });
    assert(
      gr.error !== null,
      "B must not grade candidates under A integration",
    );
  } finally {
    // Cascade-deletes each user's rows across all tables.
    if (userA) await service.auth.admin.deleteUser(userA);
    if (userB) await service.auth.admin.deleteUser(userB);
  }
});
