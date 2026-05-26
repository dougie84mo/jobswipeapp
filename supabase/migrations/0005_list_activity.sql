-- Recruit Swipe — activity feed for an integration.
--
-- Returns one row per swipe for the calling user, scoped to the given
-- integration, with the candidate + requisition denormalized inline so the
-- mobile app gets a flat list without chaining joins. SECURITY INVOKER so
-- the RLS policies on swipes / candidates / requisitions still apply.

create or replace function public.list_activity_for_integration(
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
  requisition_title text
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
    r.title as requisition_title
  from public.swipes s
  join public.candidates c on c.id = s.candidate_id
  join public.requisitions r on r.id = s.requisition_id
  where s.user_id = auth.uid()
    and r.integration_id = p_integration_id
  order by s.created_at desc;
$$;

grant execute on function public.list_activity_for_integration(uuid) to authenticated;
