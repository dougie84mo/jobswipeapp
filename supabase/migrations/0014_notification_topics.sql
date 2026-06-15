-- Recruit Swipe — per-requisition new-candidate notification opt-in.
--
-- A recruiter can subscribe to "alert me when a new candidate lands on this
-- requisition", per (integration, requisition). The detect-new-candidates edge
-- function reads enabled topics, diffs the live ATS pipeline against the cached
-- candidates, and fires send-push for genuinely new arrivals.
--
-- RLS: direct user_id scoping (same pattern as swipes / device_tokens). Writes
-- go through set_notification_topic, which verifies the integration is owned by
-- the caller before recording the row.

create table public.notification_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  requisition_external_id text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (integration_id, requisition_external_id)
);

create index notification_topics_user_id_idx
  on public.notification_topics (user_id);
-- Drives the detect function's scan of everything still switched on.
create index notification_topics_enabled_idx
  on public.notification_topics (integration_id) where enabled;

alter table public.notification_topics enable row level security;

create policy "notification_topics_self_all"
  on public.notification_topics for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Upsert a topic's enabled flag for one (integration, requisition). Verifies
-- ownership of the integration so a caller can't subscribe under someone else's.
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
  if not exists (
    select 1 from public.integrations
    where id = p_integration_id and user_id = v_user
  ) then
    raise exception 'set_notification_topic: integration not owned by caller' using errcode = '42501';
  end if;

  insert into public.notification_topics (
    user_id, integration_id, requisition_external_id, enabled
  )
  values (v_user, p_integration_id, p_requisition_external_id, coalesce(p_enabled, true))
  on conflict (integration_id, requisition_external_id) do update set
    enabled = excluded.enabled;
end;
$$;

revoke all on function public.set_notification_topic(uuid, text, boolean) from public;
grant execute on function public.set_notification_topic(uuid, text, boolean) to authenticated;
