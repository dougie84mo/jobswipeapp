-- Recruit Swipe — team data sharing.
--
-- An integration owner may share one connection with one team:
-- integrations.shared_team_id (null = private). Teammates then get:
--   - SELECT on the shared integration + its requisitions/candidates caches
--   - the ability to browse + swipe it end-to-end: read_integration_credentials
--     v2 decrypts for teammates (plaintext still never leaves the edge
--     function), record_swipe v5 accepts teammate swipes
--   - SELECT on each other's swipes + display names (shared shortlist,
--     team activity)
--
-- Everything is ADDITIVE select policies — the original owner "for all"
-- policies are untouched (Postgres ORs policies of the same command), and no
-- write policy is loosened: swipes stay author-only, the integration row
-- stays owner-only.
--
-- ⚠️ ATS attribution: a teammate's swipe actions execute through the OWNER's
-- credentials (Greenhouse On-Behalf-Of, API-key actor). That's inherent to
-- credential sharing; the share-toggle UI copy states it.
--
-- Also fixes a latent collision: notification_topics' unique key lacked
-- user_id, so two teammates couldn't both subscribe to one requisition.

-- ============================================================================
-- Sharing column
-- ============================================================================

alter table public.integrations
  add column if not exists shared_team_id uuid references public.teams(id) on delete set null;

create index if not exists integrations_shared_team_id_idx
  on public.integrations (shared_team_id) where shared_team_id is not null;

-- ============================================================================
-- Additive SELECT policies
-- ============================================================================

create policy "integrations_team_select"
  on public.integrations for select
  using (
    shared_team_id is not null and public.is_team_member(shared_team_id)
  );

create policy "requisitions_team_select"
  on public.requisitions for select
  using (
    exists (
      select 1 from public.integrations i
      where i.id = requisitions.integration_id
        and i.shared_team_id is not null
        and public.is_team_member(i.shared_team_id)
    )
  );

create policy "candidates_team_select"
  on public.candidates for select
  using (
    exists (
      select 1 from public.integrations i
      where i.id = candidates.integration_id
        and i.shared_team_id is not null
        and public.is_team_member(i.shared_team_id)
    )
  );

-- Teammates see each other's swipes (shared shortlist / team activity).
-- Writes remain author-only via the original swipes_self_all policy.
create policy "swipes_team_select"
  on public.swipes for select
  using (public.shares_team_with(user_id));

-- Display names for "Saved by {name}" in team views.
create policy "recruiter_profiles_team_select"
  on public.recruiter_profiles for select
  using (public.shares_team_with(user_id));

-- (integration_settings team visibility lands in 0020 together with its
-- per-member ownership column — granting it here would expose every member's
-- personal action config, not just the owner's team defaults.)

-- ============================================================================
-- read_integration_credentials v2 — owner OR teammate of the shared team.
-- Same signature: CREATE OR REPLACE preserves grants.
-- ============================================================================

create or replace function public.read_integration_credentials(
  p_integration_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, auth, vault
as $$
declare
  v_user uuid := auth.uid();
  v_secret_id uuid;
  v_plaintext text;
begin
  if v_user is null then
    raise exception 'read_integration_credentials: unauthenticated' using errcode = '42501';
  end if;

  select credentials_secret_id into v_secret_id
  from public.integrations
  where id = p_integration_id
    and (
      user_id = v_user
      or (
        shared_team_id is not null
        and exists (
          select 1 from public.team_members
          where team_id = integrations.shared_team_id and user_id = v_user
        )
      )
    );

  if v_secret_id is null then
    raise exception 'read_integration_credentials: integration not found or not accessible to caller' using errcode = '42501';
  end if;

  select decrypted_secret into v_plaintext
  from vault.decrypted_secrets
  where id = v_secret_id;

  if v_plaintext is null then
    raise exception 'read_integration_credentials: secret not found in vault' using errcode = '42704';
  end if;

  return v_plaintext;
end;
$$;

-- ============================================================================
-- Shared "can the caller use this integration" predicate for the write RPCs.
-- ============================================================================

create or replace function public.can_use_integration(p_integration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.integrations i
    where i.id = p_integration_id
      and (
        i.user_id = auth.uid()
        or (
          i.shared_team_id is not null
          and exists (
            select 1 from public.team_members
            where team_id = i.shared_team_id and user_id = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function public.can_use_integration(uuid) from public;
grant execute on function public.can_use_integration(uuid) to authenticated;

-- ============================================================================
-- record_swipe v5 — teammates may swipe on a shared integration. Signature
-- unchanged from v4 (0016): CREATE OR REPLACE preserves grants.
-- ============================================================================

create or replace function public.record_swipe(
  p_integration_id uuid,
  p_requisition_external_id text,
  p_requisition_title text,
  p_requisition_department text,
  p_requisition_location text,
  p_requisition_raw jsonb,
  p_candidate_external_id text,
  p_candidate_full_name text,
  p_candidate_headline text,
  p_candidate_location text,
  p_candidate_resume_url text,
  p_candidate_photo_url text,
  p_candidate_skills text[],
  p_candidate_years_experience numeric,
  p_candidate_raw jsonb,
  p_direction text,
  p_executed_actions jsonb default '[]'::jsonb,
  p_candidate_experience jsonb default null,
  p_candidate_education jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_req_id uuid;
  v_cand_id uuid;
  v_swipe_id uuid;
begin
  if v_user is null then
    raise exception 'record_swipe: unauthenticated' using errcode = '42501';
  end if;
  if not public.can_use_integration(p_integration_id) then
    raise exception 'record_swipe: integration not accessible to caller' using errcode = '42501';
  end if;
  if p_direction not in ('right','left','up') then
    raise exception 'record_swipe: invalid direction %', p_direction using errcode = '22023';
  end if;

  insert into public.requisitions (
    integration_id, external_id, title, department, location, raw
  ) values (
    p_integration_id, p_requisition_external_id,
    p_requisition_title, p_requisition_department,
    p_requisition_location, p_requisition_raw
  )
  on conflict (integration_id, external_id) do update set
    title = excluded.title,
    department = excluded.department,
    location = excluded.location,
    raw = excluded.raw,
    synced_at = now()
  returning id into v_req_id;

  insert into public.candidates (
    integration_id, requisition_id, external_id,
    full_name, headline, location, resume_url, photo_url,
    skills, years_experience, experience, education, raw
  ) values (
    p_integration_id, v_req_id, p_candidate_external_id,
    p_candidate_full_name, p_candidate_headline, p_candidate_location,
    p_candidate_resume_url, p_candidate_photo_url,
    p_candidate_skills, p_candidate_years_experience,
    p_candidate_experience, p_candidate_education, p_candidate_raw
  )
  on conflict (integration_id, external_id) do update set
    requisition_id = excluded.requisition_id,
    full_name = excluded.full_name,
    headline = excluded.headline,
    location = excluded.location,
    resume_url = excluded.resume_url,
    photo_url = excluded.photo_url,
    skills = excluded.skills,
    years_experience = excluded.years_experience,
    experience = excluded.experience,
    education = excluded.education,
    raw = excluded.raw,
    synced_at = now()
  returning id into v_cand_id;

  insert into public.swipes (
    user_id, candidate_id, requisition_id, direction, executed_actions
  ) values (
    v_user, v_cand_id, v_req_id, p_direction,
    coalesce(p_executed_actions, '[]'::jsonb)
  )
  on conflict (user_id, candidate_id) do update set
    -- No-op update so RETURNING yields the existing swipe's id rather than
    -- NULL. The original swipe's direction / executed_actions are preserved.
    direction = public.swipes.direction
  returning id into v_swipe_id;

  return v_swipe_id;
end;
$$;

-- ============================================================================
-- set_notification_topic v2 + per-user unique key fix.
-- Two teammates can now each subscribe to the same requisition.
-- ============================================================================

alter table public.notification_topics
  drop constraint if exists notification_topics_integration_id_requisition_external_id_key;

alter table public.notification_topics
  add constraint notification_topics_user_integration_req_key
  unique (user_id, integration_id, requisition_external_id);

create or replace function public.set_notification_topic(
  p_integration_id uuid,
  p_requisition_external_id text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'set_notification_topic: unauthenticated' using errcode = '42501';
  end if;
  if p_requisition_external_id is null or length(p_requisition_external_id) = 0 then
    raise exception 'set_notification_topic: requisition_external_id is required' using errcode = '22023';
  end if;
  if not public.can_use_integration(p_integration_id) then
    raise exception 'set_notification_topic: integration not accessible to caller' using errcode = '42501';
  end if;

  insert into public.notification_topics (
    user_id, integration_id, requisition_external_id, enabled
  )
  values (v_user, p_integration_id, p_requisition_external_id, coalesce(p_enabled, true))
  on conflict (user_id, integration_id, requisition_external_id) do update set
    enabled = excluded.enabled;
end;
$$;

-- ============================================================================
-- set_requisition_filters v2 — teammates may hold filters on shared decks.
-- ============================================================================

create or replace function public.set_requisition_filters(
  p_integration_id uuid,
  p_requisition_external_id text,
  p_filters jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'set_requisition_filters: unauthenticated' using errcode = '42501';
  end if;
  if p_requisition_external_id is null or length(p_requisition_external_id) = 0 then
    raise exception 'set_requisition_filters: requisition_external_id is required' using errcode = '22023';
  end if;
  if not public.can_use_integration(p_integration_id) then
    raise exception 'set_requisition_filters: integration not accessible to caller' using errcode = '42501';
  end if;

  if p_filters is null then
    delete from public.requisition_filters
    where user_id = v_user
      and integration_id = p_integration_id
      and requisition_external_id = p_requisition_external_id;
    return;
  end if;

  insert into public.requisition_filters (
    user_id, integration_id, requisition_external_id, filters
  )
  values (v_user, p_integration_id, p_requisition_external_id, p_filters)
  on conflict (user_id, integration_id, requisition_external_id) do update set
    filters = excluded.filters,
    updated_at = now();
end;
$$;

-- ============================================================================
-- list_activity_for_integration v2 — includes teammate swipes + who swiped.
-- Return type changes, so the old signature is dropped and grants re-issued.
-- SECURITY INVOKER: the new swipes/profiles SELECT policies do the scoping.
-- ============================================================================

drop function if exists public.list_activity_for_integration(uuid);

create function public.list_activity_for_integration(
  p_integration_id uuid
)
returns table(
  swipe_id uuid,
  direction text,
  executed_actions jsonb,
  created_at timestamptz,
  candidate_external_id text,
  candidate_full_name text,
  candidate_photo_url text,
  candidate_headline text,
  requisition_external_id text,
  requisition_title text,
  swiper_user_id uuid,
  swiper_display_name text
)
language sql
security invoker
set search_path = public
as $$
  select
    s.id as swipe_id,
    s.direction,
    s.executed_actions,
    s.created_at,
    c.external_id as candidate_external_id,
    c.full_name as candidate_full_name,
    c.photo_url as candidate_photo_url,
    c.headline as candidate_headline,
    r.external_id as requisition_external_id,
    r.title as requisition_title,
    s.user_id as swiper_user_id,
    p.display_name as swiper_display_name
  from public.swipes s
  join public.candidates c on c.id = s.candidate_id
  join public.requisitions r on r.id = s.requisition_id
  left join public.recruiter_profiles p on p.user_id = s.user_id
  where (s.user_id = auth.uid() or public.shares_team_with(s.user_id))
    and r.integration_id = p_integration_id
  order by s.created_at desc;
$$;

grant execute on function public.list_activity_for_integration(uuid) to authenticated;
