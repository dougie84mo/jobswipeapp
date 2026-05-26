-- Recruit Swipe — move integration credentials into Supabase Vault.
--
-- Until now, credentials_encrypted bytea has stored the cleartext API key as
-- UTF-8 bytes — fine for the mock provider, a real security gap the moment a
-- recruiter paste in a Greenhouse Harvest key. This migration replaces that
-- column with a reference to a Vault secret (vault.secrets), which pgsodium
-- encrypts at rest with a server-managed key. Plaintext is only retrievable
-- inside a SECURITY DEFINER function (read_integration_credentials), called
-- by the ats-proxy edge function under the recruiter's JWT.
--
-- Schema change:
--   integrations.credentials_encrypted bytea NOT NULL
--   →
--   integrations.credentials_secret_id uuid NOT NULL REFERENCES vault.secrets(id)
--
-- The old column is dropped after existing rows are migrated. Deploy this
-- migration and the matching ats-proxy update together: in between the two,
-- the deployed function would try to read a column that no longer exists.

create extension if not exists supabase_vault;

alter table public.integrations
  add column if not exists credentials_secret_id uuid;

-- Backfill: convert each existing row's plaintext bytea into a Vault secret.
-- vault.create_secret takes (secret text, name text, description text) and
-- returns the new secret's uuid. Naming the secret with the integration id
-- gives a paper trail in vault.secrets when debugging.
do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select id, credentials_encrypted
    from public.integrations
    where credentials_secret_id is null
  loop
    v_id := vault.create_secret(
      convert_from(r.credentials_encrypted, 'utf8'),
      'integration-' || r.id::text,
      'API credentials for integration ' || r.id::text
    );
    update public.integrations
      set credentials_secret_id = v_id
      where id = r.id;
  end loop;
end $$;

alter table public.integrations
  alter column credentials_secret_id set not null,
  drop column credentials_encrypted;

-- Replace create_integration so new rows write to Vault instead of bytea.
-- Signature unchanged so the app keeps calling rpc('create_integration', ...).
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

  insert into public.integrations (id, user_id, provider, display_label, credentials_secret_id)
  values (v_integration_id, v_user, p_provider, p_display_label, v_secret_id);

  return v_integration_id;
end;
$$;

revoke all on function public.create_integration(text, text, text) from public;
grant execute on function public.create_integration(text, text, text) to authenticated;

-- read_integration_credentials — only chokepoint that decrypts a secret.
-- SECURITY DEFINER so it can read vault.decrypted_secrets, but it first
-- verifies the caller owns the integration. The ats-proxy edge function
-- calls this with the recruiter's JWT.
create or replace function public.read_integration_credentials(
  p_integration_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, auth, vault
as $$
declare
  v_user uuid := auth.uid();
  v_secret_id uuid;
  v_plaintext text;
begin
  if v_user is null then
    raise exception 'read_integration_credentials: unauthenticated' using errcode = '42501';
  end if;

  select credentials_secret_id into v_secret_id
  from public.integrations
  where id = p_integration_id and user_id = v_user;

  if v_secret_id is null then
    raise exception 'read_integration_credentials: integration not found or not owned by caller' using errcode = '42501';
  end if;

  select decrypted_secret into v_plaintext
  from vault.decrypted_secrets
  where id = v_secret_id;

  if v_plaintext is null then
    raise exception 'read_integration_credentials: secret not found in vault' using errcode = '42704';
  end if;

  return v_plaintext;
end;
$$;

revoke all on function public.read_integration_credentials(uuid) from public;
grant execute on function public.read_integration_credentials(uuid) to authenticated;

-- Clean up the vault secret when its integration is deleted. Without this,
-- vault.secrets would accumulate orphan rows. The trigger needs SECURITY
-- DEFINER to write to the vault schema.
create or replace function public.cleanup_integration_secret()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if OLD.credentials_secret_id is not null then
    delete from vault.secrets where id = OLD.credentials_secret_id;
  end if;
  return OLD;
end;
$$;

drop trigger if exists on_integration_delete_cleanup_secret on public.integrations;
create trigger on_integration_delete_cleanup_secret
  before delete on public.integrations
  for each row execute function public.cleanup_integration_secret();
