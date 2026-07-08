-- Recruit Swipe — per-requisition candidate filter overrides.
--
-- Global filter defaults live at recruiter_profiles.app_prefs.candidate_filters
-- (jsonb pref bucket, no schema needed). This table holds the per-requisition
-- overrides: one row per (user, integration, requisition external id), with
-- the CandidateFilters object in `filters`. Keyed by requisition EXTERNAL id
-- (same posture as notification_topics) because requisitions-cache rows only
-- materialize at swipe time.
--
-- user_id is part of the unique key — unlike notification_topics v1 — so two
-- teammates sharing a connection (planned team feature) can hold different
-- filters for the same requisition.
--
-- Filtering itself is client-side at the deck query; this table is plain
-- storage. RLS: direct user_id scoping.

create table public.requisition_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  requisition_external_id text not null,
  filters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, integration_id, requisition_external_id)
);

create index requisition_filters_user_id_idx
  on public.requisition_filters (user_id);

alter table public.requisition_filters enable row level security;

create policy "requisition_filters_self_all"
  on public.requisition_filters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Upsert one requisition's filter override. NULL filters deletes the row
-- (back to inheriting the global defaults). Verifies the integration is
-- owned by the caller — the team-sharing migration loosens this to
-- owned-or-team-shared.
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
  if not exists (
    select 1 from public.integrations
    where id = p_integration_id and user_id = v_user
  ) then
    raise exception 'set_requisition_filters: integration not owned by caller' using errcode = '42501';
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

revoke all on function public.set_requisition_filters(uuid, text, jsonb) from public;
grant execute on function public.set_requisition_filters(uuid, text, jsonb) to authenticated;
