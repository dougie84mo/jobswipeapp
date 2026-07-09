// Team-sharing RLS test (migrations 0018–0020).
//
// A owns a team + a shared integration; B is a teammate; C is an outsider.
// Asserts the sharing surface end-to-end: teammate reads (integration /
// requisitions / candidates / swipes / profile), credential decryption via
// read_integration_credentials v2, teammate record_swipe, per-member
// integration_settings visibility, invite claiming — and that everything
// reverts when B leaves. isolation.test.ts continues to prove non-teammates
// are fully walled off.
//
// Runs against a local stack:
//   supabase start
//   deno test --allow-net --allow-env supabase/tests/rls/team-sharing.test.ts

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

Deno.test("RLS: team sharing grants teammate access and revokes on leave", async () => {
  const service = createClient<DB>(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const run = crypto.randomUUID();
  const emailA = `team-a-${run}@example.test`;
  const emailB = `team-b-${run}@example.test`;
  const emailC = `team-c-${run}@example.test`;
  const emailD = `team-d-${run}@example.test`; // invited before the account exists
  let userA = "", userB = "", userC = "", userD = "";

  try {
    userA = await createUser(service, emailA);
    userB = await createUser(service, emailB);
    userC = await createUser(service, emailC);
    const A = anonClient(await signIn(emailA));
    const B = anonClient(await signIn(emailB));
    const C = anonClient(await signIn(emailC));

    // A needs an active team plan: create_team, a 2nd connection, and seats
    // are all entitlement-gated since 0021. Seed via service role (the
    // webhook is the only writer in production).
    const { error: subErr } = await service.from("subscriptions").insert({
      user_id: userA,
      stripe_customer_id: "cus_test",
      stripe_subscription_id: `sub_test_${run}`,
      plan: "team",
      status: "active",
      seats: 5,
    });
    if (subErr) throw new Error(`seed subscription: ${subErr.message}`);

    // --- A: integrations (one to share, one private) + team ----------------
    const { data: sharedIntegration, error: ci1 } = await A.rpc(
      "create_integration",
      {
        p_provider: "greenhouse",
        p_display_label: "A-shared",
        p_credentials: "secret-key",
        p_on_behalf_of_user_id: "999",
        p_extras: {},
      },
    );
    if (ci1) throw new Error(`create_integration: ${ci1.message}`);
    const { data: privateIntegration, error: ci2 } = await A.rpc(
      "create_integration",
      {
        p_provider: "lever",
        p_display_label: "A-private",
        p_credentials: "other-key",
        p_on_behalf_of_user_id: null,
        p_extras: {},
      },
    );
    if (ci2) throw new Error(`create_integration 2: ${ci2.message}`);

    const { data: teamId, error: ctErr } = await A.rpc("create_team", {
      p_name: "Test Team",
    });
    if (ctErr) throw new Error(`create_team: ${ctErr.message}`);

    // Existing account → instant membership.
    const { error: invErr } = await A.rpc("invite_to_team", {
      p_team_id: teamId,
      p_email: emailB.toUpperCase(), // normalization check
      p_role: "member",
    });
    if (invErr) throw new Error(`invite_to_team: ${invErr.message}`);

    // Not-yet-existing account → pending, claimed after sign-up.
    const { error: invD } = await A.rpc("invite_to_team", {
      p_team_id: teamId,
      p_email: emailD,
      p_role: "member",
    });
    if (invD) throw new Error(`invite_to_team D: ${invD.message}`);

    // A shares ONE integration with the team (plain owner UPDATE).
    const { error: shareErr } = await A.from("integrations")
      .update({ shared_team_id: teamId })
      .eq("id", sharedIntegration);
    if (shareErr) throw new Error(`share: ${shareErr.message}`);

    // Seed cache rows + one A swipe (service role, so the test is about reads).
    const { data: req } = await service.from("requisitions").insert({
      integration_id: sharedIntegration,
      external_id: "req-1",
      title: "Shared Req",
    }).select("id").single() as any;
    const { data: cand } = await service.from("candidates").insert({
      integration_id: sharedIntegration,
      requisition_id: req.id,
      external_id: "cand-1",
      full_name: "Shared Candidate",
    }).select("id").single() as any;
    await service.from("swipes").insert({
      user_id: userA,
      candidate_id: cand.id,
      requisition_id: req.id,
      direction: "right",
    });
    // Owner's action config = team default (user_id backfill semantics).
    await service.from("integration_settings").insert({
      integration_id: sharedIntegration,
      direction: "right",
      actions: [{ type: "local_only" }],
      user_id: userA,
    });

    // --- B (teammate) can read the shared surface ---------------------------
    assertEquals(
      (await B.from("integrations").select("id")).data?.length,
      1,
      "B sees exactly the shared integration, not A-private",
    );
    assertEquals(
      (await B.from("requisitions").select("id")).data?.length,
      1,
      "B sees shared requisitions",
    );
    assertEquals(
      (await B.from("candidates").select("id")).data?.length,
      1,
      "B sees shared candidates",
    );
    assertEquals(
      (await B.from("swipes").select("id")).data?.length,
      1,
      "B sees A's swipe (shared shortlist)",
    );
    const profB = await B.from("recruiter_profiles").select("user_id");
    assert(
      (profB.data ?? []).some((r: any) => r.user_id === userA),
      "B sees A's profile (display names in team views)",
    );
    assertEquals(
      (await B.from("integration_settings").select("id")).data?.length,
      1,
      "B reads the owner's settings rows (team defaults)",
    );

    // --- B can decrypt shared credentials, C cannot ------------------------
    const credB = await B.rpc("read_integration_credentials", {
      p_integration_id: sharedIntegration,
    });
    assertEquals(credB.error, null, "teammate decryption must succeed");
    assertEquals(credB.data, "secret-key");
    const credC = await C.rpc("read_integration_credentials", {
      p_integration_id: sharedIntegration,
    });
    assert(credC.error !== null, "outsider decryption must fail");
    const credBPrivate = await B.rpc("read_integration_credentials", {
      p_integration_id: privateIntegration,
    });
    assert(credBPrivate.error !== null, "unshared integration stays private");

    // --- B can swipe on the shared deck; A sees it -------------------------
    const swipeB = await B.rpc("record_swipe", {
      p_integration_id: sharedIntegration,
      p_requisition_external_id: "req-1",
      p_requisition_title: "Shared Req",
      p_requisition_department: null,
      p_requisition_location: null,
      p_requisition_raw: null,
      p_candidate_external_id: "cand-2",
      p_candidate_full_name: "B Candidate",
      p_candidate_headline: null,
      p_candidate_location: null,
      p_candidate_resume_url: null,
      p_candidate_photo_url: null,
      p_candidate_skills: null,
      p_candidate_years_experience: null,
      p_candidate_raw: null,
      p_direction: "up",
    });
    assertEquals(swipeB.error, null, "teammate record_swipe must succeed");
    assertEquals(
      (await A.from("swipes").select("id")).data?.length,
      2,
      "A sees B's swipe",
    );
    const activity = await A.rpc("list_activity_for_integration", {
      p_integration_id: sharedIntegration,
    });
    assertEquals(activity.error, null);
    assertEquals(activity.data?.length, 2, "activity includes both swipes");
    assert(
      (activity.data ?? []).some((r: any) => r.swiper_user_id === userB),
      "activity carries the swiper id",
    );

    // --- Grades: shared visibility, author-only writes ----------------------
    const gradeA = await A.rpc("set_candidate_grade", {
      p_integration_id: sharedIntegration,
      p_requisition_external_id: "req-1",
      p_candidate_external_id: "cand-1",
      p_grade: 85,
      p_detail_grades: { skills: { React: 90 } },
      p_note: "strong",
    });
    assertEquals(gradeA.error, null, "owner set_candidate_grade must succeed");
    const gradesSeenByB = await B.from("candidate_grades").select(
      "user_id, grade",
    );
    assert(
      (gradesSeenByB.data ?? []).some((r: any) =>
        r.user_id === userA && r.grade === 85
      ),
      "B sees A's grade on the shared integration",
    );
    const gradeB = await B.rpc("set_candidate_grade", {
      p_integration_id: sharedIntegration,
      p_requisition_external_id: "req-1",
      p_candidate_external_id: "cand-1",
      p_grade: 60,
      p_detail_grades: {},
      p_note: null,
    });
    assertEquals(gradeB.error, null, "teammate grades their own row");
    const gradeUpd = await B.from("candidate_grades")
      .update({ grade: 1 })
      .eq("user_id", userA)
      .select("id");
    assertEquals(gradeUpd.data?.length, 0, "B must not update A's grade");
    const gradeC = await C.rpc("set_candidate_grade", {
      p_integration_id: sharedIntegration,
      p_requisition_external_id: "req-1",
      p_candidate_external_id: "cand-1",
      p_grade: 50,
      p_detail_grades: {},
      p_note: null,
    });
    assert(gradeC.error !== null, "outsider must not grade");

    // --- B cannot write A's rows -------------------------------------------
    const upd = await B.from("integrations")
      .update({ display_label: "hacked" })
      .eq("id", sharedIntegration)
      .select("id");
    assertEquals(upd.data?.length, 0, "B must not update A's integration");
    const insForged = await B.from("integration_settings").insert({
      integration_id: sharedIntegration,
      direction: "left",
      actions: [],
      user_id: userA, // forging the owner's row must fail
    }).select("id");
    assert(insForged.error !== null, "B must not write rows as A");
    const insOwn = await B.from("integration_settings").insert({
      integration_id: sharedIntegration,
      direction: "left",
      actions: [],
      user_id: userB,
    }).select("id");
    assertEquals(insOwn.error, null, "B saves a personal override");

    // --- C (outsider) sees nothing ------------------------------------------
    for (
      const table of [
        "integrations",
        "requisitions",
        "candidates",
        "swipes",
        "teams",
        "team_members",
      ]
    ) {
      const { data, error } = await C.from(table).select("id");
      assertEquals(error, null, `${table}: unexpected error for C`);
      assertEquals(data?.length, 0, `${table}: C must see nothing`);
    }

    // --- Pending invite is claimed on first sign-in --------------------------
    userD = await createUser(service, emailD);
    const D = anonClient(await signIn(emailD));
    const claimed = await D.rpc("claim_team_invites");
    assertEquals(claimed.error, null);
    assertEquals(claimed.data, 1, "D claims exactly one invite");
    assertEquals(
      (await D.from("integrations").select("id")).data?.length,
      1,
      "D (new teammate) sees the shared integration",
    );

    // --- Leaving revokes everything ------------------------------------------
    const leave = await B.rpc("leave_team", { p_team_id: teamId });
    assertEquals(leave.error, null, "leave_team must succeed");
    for (const table of ["integrations", "requisitions", "candidates"]) {
      assertEquals(
        (await B.from(table).select("id")).data?.length,
        0,
        `${table}: B's access must revert after leaving`,
      );
    }
    // B's own swipe row survives (their history), but A's is gone from view.
    const swipesAfter = await B.from("swipes").select("user_id");
    assert(
      (swipesAfter.data ?? []).every((r: any) => r.user_id === userB),
      "B keeps only their own swipes after leaving",
    );
    const credAfter = await B.rpc("read_integration_credentials", {
      p_integration_id: sharedIntegration,
    });
    assert(credAfter.error !== null, "decryption revoked after leaving");
    const gradesAfter = await B.from("candidate_grades").select("user_id");
    assert(
      (gradesAfter.data ?? []).every((r: any) => r.user_id === userB),
      "B keeps only their own grades after leaving",
    );
    const gradeAfterLeave = await B.rpc("set_candidate_grade", {
      p_integration_id: sharedIntegration,
      p_requisition_external_id: "req-1",
      p_candidate_external_id: "cand-1",
      p_grade: 70,
      p_detail_grades: {},
      p_note: null,
    });
    assert(
      gradeAfterLeave.error !== null,
      "grading revoked after leaving",
    );

    // --- Owner cannot abandon the team ---------------------------------------
    const ownerLeave = await A.rpc("leave_team", { p_team_id: teamId });
    assert(
      ownerLeave.error !== null,
      "last owner must not be able to leave",
    );
  } finally {
    if (userA) await service.auth.admin.deleteUser(userA);
    if (userB) await service.auth.admin.deleteUser(userB);
    if (userC) await service.auth.admin.deleteUser(userC);
    if (userD) await service.auth.admin.deleteUser(userD);
  }
});
