-- Recruit Swipe — four-tier pricing.
--
-- Replaces the two-tier (pro/team) model from 0021 with four tiers. The
-- entitled plan is derived from `subscriptions`; the free tier is the ABSENCE
-- of an entitled row, so it has no plan value and never appears in the table.
--
-- Plans (constants mirrored in src/features/billing/entitlements.ts):
--   freelancer — no row.  1 connected source, 1 seat, no teams
--   basic      — $5/mo.   2 connected sources, 1 seat, no teams
--   pro        — $20/mo.  5 connected sources, 1 seat + $15/extra seat, teams
--   team_pro   — $100/mo. unlimited sources, 10 seats, teams
--
-- Seats are billed as separate Stripe line items on the pro plan (base price
-- includes seat 1; the extra-seat price carries quantity = seats - 1), so the
-- stripe-webhook function computes `seats` rather than reading one quantity.
--
-- Safe as a plain check swap: `select count(*) from subscriptions` was 0 when
-- this was authored — no live rows carried the old 'team' value.

alter table public.subscriptions
  drop constraint subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('basic','pro','team_pro'));

-- ============================================================================
-- Connection caps per plan
-- ============================================================================

-- Connected-source ceiling for a user's entitled plan. NULL = unlimited.
-- Kept as a function (not a table) so the limits stay in one place alongside
-- the entitlement check and can't drift out of sync with a lookup row.
create or replace function public.connection_limit_for(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.has_active_plan(p_user, array['team_pro']) then null
    when public.has_active_plan(p_user, array['pro'])      then 5
    when public.has_active_plan(p_user, array['basic'])    then 2
    else 1
  end;
$$;

revoke all on function public.connection_limit_for(uuid) from public;
grant execute on function public.connection_limit_for(uuid) to authenticated;

-- create_integration v5 — per-plan connection cap (was: 1 free, then unlimited).
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
  v_limit integer;
  v_used integer;
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

  v_limit := public.connection_limit_for(v_user);
  if v_limit is not null then
    select count(*) into v_used from public.integrations where user_id = v_user;
    if v_used >= v_limit then
      raise exception 'Your plan includes % connected source(s). Upgrade in Settings → Subscriptions to connect more.', v_limit
        using errcode = 'P0001';
    end if;
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

-- ============================================================================
-- Team gates — 'team' becomes 'pro' or 'team_pro'
-- ============================================================================

-- create_team v3 — pro and team_pro both carry seats, so both can create teams.
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user is null then
    raise exception 'create_team: unauthenticated' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'create_team: name is required' using errcode = '22023';
  end if;
  if not public.has_active_plan(v_user, array['pro','team_pro']) then
    raise exception 'Creating a team requires an active Pro or Team Pro plan. Upgrade in Settings → Subscriptions.'
      using errcode = 'P0001';
  end if;

  insert into public.teams (name, created_by)
  values (trim(p_name), v_user)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_user, 'owner');

  return v_team_id;
end;
$$;

-- invite_to_team v3 — seats come from either seat-bearing plan.
create or replace function public.invite_to_team(
  p_team_id uuid,
  p_email text,
  p_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_invitee uuid;
  v_owner uuid;
  v_seats integer;
  v_used integer;
begin
  if v_user is null then
    raise exception 'invite_to_team: unauthenticated' using errcode = '42501';
  end if;
  if not public.is_team_admin(p_team_id) then
    raise exception 'invite_to_team: caller is not a team owner/admin' using errcode = '42501';
  end if;
  if v_email is null or position('@' in v_email) <= 1 then
    raise exception 'invite_to_team: valid email is required' using errcode = '22023';
  end if;
  if p_role not in ('admin','member') then
    raise exception 'invite_to_team: invalid role %', p_role using errcode = '22023';
  end if;

  -- Seats come from the OWNER's seat-bearing subscription (1 = just the owner).
  select user_id into v_owner from public.team_members
  where team_id = p_team_id and role = 'owner'
  order by created_at limit 1;
  select coalesce(max(seats), 1) into v_seats from public.subscriptions
  where user_id = v_owner and plan in ('pro','team_pro')
    and status in ('active','trialing','past_due');
  select count(*) into v_used from (
    select user_id from public.team_members where team_id = p_team_id
    union all
    select null from public.team_invites
    where team_id = p_team_id and status = 'pending'
  ) t;
  if v_used >= v_seats then
    raise exception 'This team has used all % seat(s). Add seats in Settings → Subscriptions.', v_seats
      using errcode = 'P0001';
  end if;

  select id into v_invitee from auth.users where lower(email) = v_email;

  if v_invitee is not null then
    if exists (
      select 1 from public.team_members
      where team_id = p_team_id and user_id = v_invitee
    ) then
      raise exception 'invite_to_team: already a member' using errcode = '23505';
    end if;
    insert into public.team_members (team_id, user_id, role)
    values (p_team_id, v_invitee, p_role);
    insert into public.team_invites (team_id, email, role, invited_by, status)
    values (p_team_id, v_email, p_role, v_user, 'accepted');
    return;
  end if;

  insert into public.team_invites (team_id, email, role, invited_by, status)
  values (p_team_id, v_email, p_role, v_user, 'pending')
  on conflict (team_id, email) where status = 'pending' do nothing;
end;
$$;
