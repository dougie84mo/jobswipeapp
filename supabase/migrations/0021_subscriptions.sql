-- Recruit Swipe — Stripe subscriptions + entitlement gates.
--
-- Billing model: Stripe customer + subscription PER USER. The team plan is
-- seat-quantified and bought by the team owner; teammates inherit visibility
-- of the owner's subscription row (shares_team_with) so the UI can explain
-- who pays. Rows are written ONLY by the stripe-webhook edge function
-- (service role) — no authenticated write policies exist.
--
-- Plans (constants mirrored in src/features/billing/entitlements.ts):
--   free — 1 connection, no teams
--   pro  — unlimited connections
--   team — pro + create teams up to `seats` members
--
-- status holds Stripe's subscription status verbatim; active/trialing/
-- past_due count as entitled (past_due = payment retry grace).

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('pro','team')),
  status text not null,
  seats integer not null default 1 check (seats >= 1),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan)
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

-- Own rows + team-owners' rows (so members see what plan covers the team).
create policy "subscriptions_self_or_team_select"
  on public.subscriptions for select
  using (user_id = auth.uid() or public.shares_team_with(user_id));

-- ============================================================================
-- Entitlement helper + gates
-- ============================================================================

create or replace function public.has_active_plan(p_user uuid, p_plans text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user
      and plan = any(p_plans)
      and status in ('active','trialing','past_due')
  );
$$;

revoke all on function public.has_active_plan(uuid, text[]) from public;
grant execute on function public.has_active_plan(uuid, text[]) to authenticated;

-- create_team v2 — creating a team requires an active team plan.
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
  if not public.has_active_plan(v_user, array['team']) then
    raise exception 'Creating a team requires an active Team plan. Upgrade in Settings → Subscriptions.'
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

-- invite_to_team v2 — seat enforcement: members + pending invites must stay
-- within the owner's purchased seats.
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

  -- Seats come from the OWNER's team subscription (1 = just the owner).
  select user_id into v_owner from public.team_members
  where team_id = p_team_id and role = 'owner'
  order by created_at limit 1;
  select coalesce(max(seats), 1) into v_seats from public.subscriptions
  where user_id = v_owner and plan = 'team'
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

-- create_integration v4 — a second connection requires pro or team.
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

  if (select count(*) from public.integrations where user_id = v_user) >= 1
    and not public.has_active_plan(v_user, array['pro','team'])
  then
    raise exception 'The free plan includes one connected source. Upgrade to Pro in Settings → Subscriptions to connect more.'
      using errcode = 'P0001';
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
