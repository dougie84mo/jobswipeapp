-- Recruit Swipe — one integration per (user, provider).
--
-- The Connect ATS screen lets a recruiter tap "Connect" repeatedly,
-- inserting a fresh integrations row each time. Dedupe existing duplicates
-- (keeping the oldest), add a unique constraint so future dupes are
-- rejected at the DB, and pin the rejection error to the calling code with
-- a clear messaging via the create_integration RPC body.
--
-- Mock connections especially had no reason to be duplicated — they all
-- point at the same fake fixtures.

-- Step 1: dedupe. For each (user_id, provider), keep the earliest
-- connected_at, delete the rest. The on-delete cleanup_integration_secret
-- trigger from 0006 handles purging the matching vault.secrets rows.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, provider
           order by connected_at asc, id asc
         ) as rn
  from public.integrations
)
delete from public.integrations
where id in (select id from ranked where rn > 1);

-- Step 2: unique constraint. Prevents new duplicates regardless of UI bugs.
alter table public.integrations
  add constraint integrations_user_provider_unique unique (user_id, provider);

-- Step 3: surface the violation as a clear app-readable error in
-- create_integration. unique_violation is sqlstate 23505. Replace the body;
-- signature stays the same so the app's RPC call doesn't change.
create or replace function public.create_integration(
  p_provider text,
  p_display_label text,
  p_credentials text,
  p_on_behalf_of_user_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_integration_id uuid := gen_random_uuid();
  v_secret_id uuid;
begin
  if v_user is null then
    raise exception 'create_integration: unauthenticated' using errcode = '42501';
  end if;
  if p_provider is null or length(p_provider) = 0 then
    raise exception 'create_integration: provider is required' using errcode = '22023';
  end if;
  if p_credentials is null or length(p_credentials) = 0 then
    raise exception 'create_integration: credentials are required' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.integrations
    where user_id = v_user and provider = p_provider
  ) then
    raise exception 'You already have a % connection. Disconnect it before connecting a new one.', p_provider
      using errcode = '23505';
  end if;

  v_secret_id := vault.create_secret(
    p_credentials,
    'integration-' || v_integration_id::text,
    'API credentials for integration ' || v_integration_id::text
  );

  insert into public.integrations (
    id, user_id, provider, display_label, credentials_secret_id, on_behalf_of_user_id
  )
  values (
    v_integration_id, v_user, p_provider, p_display_label,
    v_secret_id, nullif(trim(p_on_behalf_of_user_id), '')
  );

  return v_integration_id;
end;
$$;

revoke all on function public.create_integration(text, text, text, text) from public;
grant execute on function public.create_integration(text, text, text, text) to authenticated;
