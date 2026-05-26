-- Recruit Swipe — push notification plumbing.
--
-- device_tokens stores one row per device per user. expo_push_token is the
-- ExponentPushToken[...] string returned by expo-notifications'
-- getExpoPushTokenAsync; that's what the send-push edge function POSTs to
-- exp.host/--/api/v2/push/send.
--
-- recruiter_profiles.notification_prefs is a jsonb opt-in map. Today only
-- { "push_enabled": true|false } exists; future keys (per-integration
-- filters, quiet hours) land here without a schema migration.
--
-- Push doesn't fire in stock Expo Go (SDK 54 stripped that capability). The
-- registration code in src/features/notifications silently no-ops when
-- getExpoPushTokenAsync rejects, so this scaffold is dormant until the
-- project moves to a dev client.

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios','android','web','unknown')),
  device_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index device_tokens_user_id_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_self_all"
  on public.device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.recruiter_profiles
  add column if not exists notification_prefs jsonb not null default '{"push_enabled": true}'::jsonb;

-- Idempotent: same expo_push_token from the same user just updates
-- last_seen_at. From a different user (e.g. after sign-out / sign-in on a
-- shared device) reassigns the token to the new user — the previous user
-- shouldn't keep receiving pushes from that device.
create or replace function public.register_device_token(
  p_expo_push_token text,
  p_platform text,
  p_device_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'register_device_token: unauthenticated' using errcode = '42501';
  end if;
  if p_expo_push_token is null or length(p_expo_push_token) = 0 then
    raise exception 'register_device_token: expo_push_token is required' using errcode = '22023';
  end if;
  if p_platform not in ('ios','android','web','unknown') then
    raise exception 'register_device_token: invalid platform %', p_platform using errcode = '22023';
  end if;

  insert into public.device_tokens (user_id, expo_push_token, platform, device_name)
  values (v_user, p_expo_push_token, p_platform, p_device_name)
  on conflict (expo_push_token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    device_name = coalesce(excluded.device_name, public.device_tokens.device_name),
    last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_device_token(text, text, text) from public;
grant execute on function public.register_device_token(text, text, text) to authenticated;
