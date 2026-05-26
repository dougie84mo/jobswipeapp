-- Recruit Swipe — record_swipe now persists executed_actions.
--
-- When a swipe runs configured ATS actions (advance stage, apply tag, send
-- template, reject, add note), the app collects the per-step outcome as an
-- ExecutedAction[] and hands it to record_swipe to store on
-- swipes.executed_actions. The Activity / history screen and retry flow
-- read it back from there.
--
-- Adds a 17th parameter (p_executed_actions, defaulting to '[]'::jsonb) to
-- the existing record_swipe. The old signature is dropped — Postgres
-- CREATE OR REPLACE FUNCTION can't change a function signature, only its
-- body. Default is empty so this migration is safe to deploy ahead of the
-- app rev that starts passing actions in.

drop function if exists public.record_swipe(
  uuid, text, text, text, text, jsonb,
  text, text, text, text, text, text, text[], numeric, jsonb,
  text
);

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
  p_executed_actions jsonb default '[]'::jsonb
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
  if not exists (
    select 1 from public.integrations
    where id = p_integration_id and user_id = v_user
  ) then
    raise exception 'record_swipe: integration not owned by caller' using errcode = '42501';
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
    skills, years_experience, raw
  ) values (
    p_integration_id, v_req_id, p_candidate_external_id,
    p_candidate_full_name, p_candidate_headline, p_candidate_location,
    p_candidate_resume_url, p_candidate_photo_url,
    p_candidate_skills, p_candidate_years_experience, p_candidate_raw
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
    raw = excluded.raw,
    synced_at = now()
  returning id into v_cand_id;

  insert into public.swipes (
    user_id, candidate_id, requisition_id, direction, executed_actions
  ) values (
    v_user, v_cand_id, v_req_id, p_direction,
    coalesce(p_executed_actions, '[]'::jsonb)
  )
  on conflict (user_id, candidate_id) do nothing
  returning id into v_swipe_id;

  return v_swipe_id;
end;
$$;

revoke all on function public.record_swipe(
  uuid, text, text, text, text, jsonb,
  text, text, text, text, text, text, text[], numeric, jsonb,
  text, jsonb
) from public;
grant execute on function public.record_swipe(
  uuid, text, text, text, text, jsonb,
  text, text, text, text, text, text, text[], numeric, jsonb,
  text, jsonb
) to authenticated;
