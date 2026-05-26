-- Recruit Swipe — Greenhouse write methods need an On-Behalf-Of header
-- pointing at the recruiter's Greenhouse user id. Capture it at connect
-- time, persist it on the integrations row, and surface it to the ats-proxy
-- alongside the credential lookup.
--
-- Optional column — empty for mock, optional for Greenhouse. Write actions
-- against a Greenhouse integration with no on_behalf_of_user_id fail at the
-- proxy with a clear "configure your Greenhouse user id" error rather than
-- silently posting under the wrong identity.

alter table public.integrations
  add column if not exists on_behalf_of_user_id text;

-- Replace create_integration with a fourth param (defaulted) so existing
-- callers keep working. Postgres function defaults let
-- create_integration(p1, p2, p3) resolve to this signature without changes.
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
