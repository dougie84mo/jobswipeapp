-- Recruit Swipe — manual candidate grading (Grade deck mode).
--
-- One row per (user, integration, requisition external id, candidate external
-- id): an overall 1-100 grade, per-skill / per-category detail grades in
-- `detail_grades`, and a free-text note. Grades are record-only — no ATS
-- writes — and exist so recruiters can rank candidates for client
-- coordination. Keyed by EXTERNAL ids (same posture as requisition_filters /
-- notification_topics) because cache rows only materialize at swipe time and
-- graded candidates may never be swiped.
--
-- detail_grades shape (validated client-side; the RPC is the only write path):
--   { "skills": {"React": 90, "SQL": 75}, "categories": {"experience": 80, "education": 70} }
--
-- Write semantics: the client merges partial edits into the full object and
-- the RPC replaces the row wholesale (jsonb merge can't express key deletion).
-- All-empty input deletes the row ("Clear grade").

create table public.candidate_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  requisition_external_id text not null,
  candidate_external_id text not null,
  -- Nullable: a recruiter may grade individual skills before committing an
  -- overall number.
  grade int check (grade between 1 and 100),
  detail_grades jsonb not null default '{}'::jsonb,
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, integration_id, requisition_external_id, candidate_external_id)
);

create index candidate_grades_user_id_idx
  on public.candidate_grades (user_id);

-- Candidates-tab join: match cards look up grades by integration + candidate.
create index candidate_grades_integration_candidate_idx
  on public.candidate_grades (integration_id, candidate_external_id);

alter table public.candidate_grades enable row level security;

create policy "candidate_grades_self_all"
  on public.candidate_grades for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Teammates on a shared connection see each other's grades (grades exist for
-- coordination). Writes remain author-only via candidate_grades_self_all.
create policy "candidate_grades_team_select"
  on public.candidate_grades for select
  using (
    exists (
      select 1 from public.integrations i
      where i.id = candidate_grades.integration_id
        and i.shared_team_id is not null
        and public.is_team_member(i.shared_team_id)
    )
  );

-- Upsert the caller's grade row for one candidate. Full replace on conflict;
-- all-empty input (no grade, no detail grades, blank note) deletes the row.
-- Gated on can_use_integration so teammates can grade on shared connections.
create or replace function public.set_candidate_grade(
  p_integration_id uuid,
  p_requisition_external_id text,
  p_candidate_external_id text,
  p_grade int,
  p_detail_grades jsonb,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_details jsonb := coalesce(p_detail_grades, '{}'::jsonb);
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_user is null then
    raise exception 'set_candidate_grade: unauthenticated' using errcode = '42501';
  end if;
  if p_requisition_external_id is null or length(p_requisition_external_id) = 0 then
    raise exception 'set_candidate_grade: requisition_external_id is required' using errcode = '22023';
  end if;
  if p_candidate_external_id is null or length(p_candidate_external_id) = 0 then
    raise exception 'set_candidate_grade: candidate_external_id is required' using errcode = '22023';
  end if;
  if not public.can_use_integration(p_integration_id) then
    raise exception 'set_candidate_grade: integration not accessible to caller' using errcode = '42501';
  end if;
  if p_grade is not null and (p_grade < 1 or p_grade > 100) then
    raise exception 'set_candidate_grade: grade must be between 1 and 100' using errcode = '22023';
  end if;

  if p_grade is null and v_details = '{}'::jsonb and v_note is null then
    delete from public.candidate_grades
    where user_id = v_user
      and integration_id = p_integration_id
      and requisition_external_id = p_requisition_external_id
      and candidate_external_id = p_candidate_external_id;
    return;
  end if;

  insert into public.candidate_grades (
    user_id, integration_id, requisition_external_id, candidate_external_id,
    grade, detail_grades, note
  )
  values (
    v_user, p_integration_id, p_requisition_external_id, p_candidate_external_id,
    p_grade, v_details, v_note
  )
  on conflict (user_id, integration_id, requisition_external_id, candidate_external_id)
  do update set
    grade = excluded.grade,
    detail_grades = excluded.detail_grades,
    note = excluded.note,
    updated_at = now();
end;
$$;

revoke all on function public.set_candidate_grade(uuid, text, text, int, jsonb, text) from public;
grant execute on function public.set_candidate_grade(uuid, text, text, int, jsonb, text) to authenticated;
