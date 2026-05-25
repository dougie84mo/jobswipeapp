-- Recruit Swipe — record_swipe RPC and a helper to list already-swiped
-- candidate external ids per requisition.
--
-- record_swipe upserts the requisition + candidate caches and inserts the
-- swipe row in a single atomic call so the client doesn't have to chain
-- three round-trips. The candidates / requisitions tables don't yet have
-- a write path from the app (RLS would allow it but the JSON contract is
-- noisy); this RPC IS that write path.
--
-- list_swiped_candidate_external_ids drives the swipe-deck filter so the
-- recruiter doesn't see the same candidate twice for the same requisition.

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
  p_direction text
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
    user_id, candidate_id, requisition_id, direction
  ) values (
    v_user, v_cand_id, v_req_id, p_direction
  )
  on conflict (user_id, candidate_id) do nothing
  returning id into v_swipe_id;

  return v_swipe_id;
end;
$$;

revoke all on function public.record_swipe(
  uuid, text, text, text, text, jsonb,
  text, text, text, text, text, text, text[], numeric, jsonb,
  text
) from public;
grant execute on function public.record_swipe(
  uuid, text, text, text, text, jsonb,
  text, text, text, text, text, text, text[], numeric, jsonb,
  text
) to authenticated;

create or replace function public.list_swiped_candidate_external_ids(
  p_integration_id uuid,
  p_requisition_external_id text
)
returns table(external_id text)
language sql
security invoker
set search_path = public
as $$
  select c.external_id
  from public.swipes s
  join public.candidates c on c.id = s.candidate_id
  join public.requisitions r on r.id = c.requisition_id
  where s.user_id = auth.uid()
    and r.integration_id = p_integration_id
    and r.external_id = p_requisition_external_id;
$$;

grant execute on function public.list_swiped_candidate_external_ids(uuid, text) to authenticated;
