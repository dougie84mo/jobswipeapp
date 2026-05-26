-- Recruit Swipe — patch swipes.executed_actions after a retry.
--
-- The Activity screen lets the recruiter retry an individual failed step.
-- After the executor re-runs that step and produces a fresh ExecutedAction,
-- the app needs to update the swipe row's executed_actions[] array with
-- the new entry in place of the old. Doing it as one RPC keeps the swap
-- atomic and keeps the access pattern uniform with the other write RPCs.

create or replace function public.set_swipe_executed_actions(
  p_swipe_id uuid,
  p_executed_actions jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_executed_actions is null then
    raise exception 'set_swipe_executed_actions: executed_actions is required' using errcode = '22023';
  end if;

  update public.swipes
    set executed_actions = p_executed_actions
    where id = p_swipe_id;

  -- RLS scopes the update to the caller; if no row matches we silently
  -- 0-update and the app falls back to its standard query invalidation
  -- (the activity feed re-fetches and renders whatever the server has).
end;
$$;

grant execute on function public.set_swipe_executed_actions(uuid, jsonb) to authenticated;
