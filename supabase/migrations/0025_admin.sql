-- Recruit Swipe — admin panel (phase 1: read-only).
--
-- admin_users is the allowlist for the web admin panel. The admin-api edge
-- function verifies the caller's JWT, lower-cases its email claim, and checks
-- it against this table using the service role. RLS is enabled with NO
-- policies — the same pattern as notification_seen — so anon/authenticated
-- can neither read nor write it; only the service role (which bypasses RLS)
-- can touch it.
--
-- Email-keyed (not user_id) so an admin can be allowlisted before their
-- account exists.

create table public.admin_users (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

insert into public.admin_users (email, note)
values ('douglasrich9215@gmail.com', 'founder')
on conflict (email) do nothing;

-- ============================================================================
-- Auth-users read helper
-- ============================================================================

-- PostgREST only exposes the public schema, so the service-role client can't
-- select from auth.users directly. This SECURITY DEFINER function packages the
-- four columns the admin panel needs (emails lower-cased to match the
-- allowlist convention). Granted ONLY to service_role — same trust model as
-- read_pending_notification_scans (0015).
create or replace function public.admin_list_auth_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, lower(u.email), u.created_at, u.last_sign_in_at
  from auth.users u;
$$;

revoke all on function public.admin_list_auth_users() from public, anon, authenticated;
grant execute on function public.admin_list_auth_users() to service_role;
