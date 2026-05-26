-- Recruit Swipe — per-provider arbitrary config on integrations rows.
--
-- on_behalf_of_user_id was Greenhouse-specific from day one. Other providers
-- have their own connect-time config: Workable needs an account subdomain,
-- Recruitee needs the company subdomain, ZipRecruiter will need an org id,
-- etc. Rather than adding a column per provider, extras is a jsonb bag:
--   { "subdomain": "acme" }     // Workable / Recruitee
--   { "org_id": "12345" }       // future
-- Per-provider Deno clients read the keys they care about.
--
-- on_behalf_of_user_id stays put for Greenhouse to keep the rollout small —
-- migrating Greenhouse rows into extras.on_behalf_of_user_id is a follow-up.

alter table public.integrations
  add column if not exists extras jsonb not null default '{}'::jsonb;

-- create_integration gains a p_extras jsonb default '{}' so existing callers
-- keep working. New providers pass their config via this arg.
create or replace function public.create_integration(
  p_provider text,
  p_display_label text,
  p_credentials text,
  p_on_behalf_of_user_id text default null,
  p_extras jsonb default '{}'::jsonb
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
    id, user_id, provider, display_label,
    credentials_secret_id, on_behalf_of_user_id, extras
  )
  values (
    v_integration_id, v_user, p_provider, p_display_label,
    v_secret_id,
    nullif(trim(p_on_behalf_of_user_id), ''),
    coalesce(p_extras, '{}'::jsonb)
  );

  return v_integration_id;
end;
$$;

revoke all on function public.create_integration(text, text, text, text, jsonb) from public;
grant execute on function public.create_integration(text, text, text, text, jsonb) to authenticated;
