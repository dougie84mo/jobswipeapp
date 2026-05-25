-- Recruit Swipe — integration write RPC.
--
-- The mobile app cannot insert raw bytea through PostgREST cleanly, and we
-- want a single chokepoint where credentials get encrypted before landing in
-- `integrations.credentials_encrypted`. Today the RPC stores credentials as
-- UTF-8 bytes; in phase 4 the body will be replaced to encrypt with pgsodium /
-- Supabase Vault. Callers (the app, the connect screen) don't change.

create or replace function public.create_integration(
  p_provider text,
  p_display_label text,
  p_credentials text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_user uuid := auth.uid();
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

  insert into public.integrations (user_id, provider, display_label, credentials_encrypted)
  values (v_user, p_provider, p_display_label, convert_to(p_credentials, 'utf8'))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_integration(text, text, text) from public;
grant execute on function public.create_integration(text, text, text) to authenticated;
