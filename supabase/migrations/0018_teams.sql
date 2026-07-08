-- Recruit Swipe — teams: recruitment teams and freelance recruiter
-- partnerships (a partnership is just a small team; one model covers both).
--
-- Shape:
--   teams          — id, name, created_by
--   team_members   — (team_id, user_id, role owner|admin|member)
--   team_invites   — invite-by-email; claimed on the invitee's next sign-in
--                    via claim_team_invites() (called from SessionProvider),
--                    or instantly when the email already has an account.
--
-- RLS strategy: helper predicates is_team_member / is_team_admin /
-- shares_team_with are SECURITY DEFINER (they must read team_members without
-- recursing into its own policies) and STABLE (planner caches per statement).
-- All membership writes go through SECURITY DEFINER RPCs — the tables expose
-- SELECT (and a scoped UPDATE for invite revocation) only.
--
-- Data sharing (integrations.shared_team_id + the cross-table SELECT
-- policies) lands in 0019 so this migration is purely the team fabric.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null default 'member' check (role in ('admin','member')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);

-- One live invite per (team, email); accepted/revoked history can accumulate.
create unique index team_invites_pending_uniq
  on public.team_invites (team_id, email) where status = 'pending';
create index team_invites_email_idx on public.team_invites (email) where status = 'pending';

-- ============================================================================
-- Membership helpers (used by policies here and across 0019)
-- ============================================================================

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

-- True when the caller IS p_owner or shares at least one team with them.
create or replace function public.shares_team_with(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_owner = auth.uid() or exists (
    select 1
    from public.team_members me
    join public.team_members them on them.team_id = me.team_id
    where me.user_id = auth.uid() and them.user_id = p_owner
  );
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_admin(uuid) from public;
revoke all on function public.shares_team_with(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;
grant execute on function public.shares_team_with(uuid) to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

create policy "teams_member_select"
  on public.teams for select
  using (public.is_team_member(id));

create policy "teams_owner_update"
  on public.teams for update
  using (exists (
    select 1 from public.team_members
    where team_id = teams.id and user_id = auth.uid() and role = 'owner'
  ))
  with check (exists (
    select 1 from public.team_members
    where team_id = teams.id and user_id = auth.uid() and role = 'owner'
  ));

create policy "teams_owner_delete"
  on public.teams for delete
  using (exists (
    select 1 from public.team_members
    where team_id = teams.id and user_id = auth.uid() and role = 'owner'
  ));

create policy "team_members_member_select"
  on public.team_members for select
  using (public.is_team_member(team_id));

-- Membership INSERT/UPDATE/DELETE only via the SECURITY DEFINER RPCs below.

create policy "team_invites_admin_select"
  on public.team_invites for select
  using (public.is_team_admin(team_id));

-- Revocation is a status flip by an owner/admin; inserts go through
-- invite_to_team so email normalization + instant-add stay in one place.
create policy "team_invites_admin_update"
  on public.team_invites for update
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

-- ============================================================================
-- RPCs
-- ============================================================================

-- Create a team; the caller becomes its owner. (0021 adds the subscription
-- entitlement check here.)
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

  insert into public.teams (name, created_by)
  values (trim(p_name), v_user)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (v_team_id, v_user, 'owner');

  return v_team_id;
end;
$$;

-- Invite an email to the team. If that email already has an account, the
-- membership is created immediately (invite recorded as accepted); otherwise
-- it stays pending until claim_team_invites() runs after their sign-up.
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

-- Claim any pending invites addressed to the caller's email. Called once per
-- session from the app (SessionProvider) — covers both fresh sign-ups and
-- accounts that pre-dated the invite. Returns how many teams were joined.
create or replace function public.claim_team_invites()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_count integer := 0;
  r record;
begin
  if v_user is null then
    raise exception 'claim_team_invites: unauthenticated' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_user;
  if v_email is null then
    return 0;
  end if;

  for r in
    select id, team_id, role from public.team_invites
    where status = 'pending' and email = v_email
  loop
    insert into public.team_members (team_id, user_id, role)
    values (r.team_id, v_user, r.role)
    on conflict (team_id, user_id) do nothing;
    update public.team_invites set status = 'accepted' where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Leave a team. The last owner must delete the team (or promote a
-- replacement owner first) rather than abandon it.
create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
begin
  if v_user is null then
    raise exception 'leave_team: unauthenticated' using errcode = '42501';
  end if;
  select role into v_role from public.team_members
  where team_id = p_team_id and user_id = v_user;
  if v_role is null then
    raise exception 'leave_team: not a member' using errcode = '42501';
  end if;
  if v_role = 'owner' and not exists (
    select 1 from public.team_members
    where team_id = p_team_id and role = 'owner' and user_id <> v_user
  ) then
    raise exception 'leave_team: the last owner must delete the team or transfer ownership first'
      using errcode = '23514';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = v_user;
end;
$$;

-- Remove a member. Owners can remove anyone but owners; admins can remove
-- plain members only.
create or replace function public.remove_team_member(
  p_team_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
begin
  if v_user is null then
    raise exception 'remove_team_member: unauthenticated' using errcode = '42501';
  end if;
  select role into v_caller_role from public.team_members
  where team_id = p_team_id and user_id = v_user;
  select role into v_target_role from public.team_members
  where team_id = p_team_id and user_id = p_user_id;
  if v_target_role is null then
    raise exception 'remove_team_member: target is not a member' using errcode = '22023';
  end if;
  if v_caller_role is null
    or v_caller_role = 'member'
    or v_target_role = 'owner'
    or (v_caller_role = 'admin' and v_target_role = 'admin')
  then
    raise exception 'remove_team_member: not allowed' using errcode = '42501';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = p_user_id;
end;
$$;

revoke all on function public.create_team(text) from public;
revoke all on function public.invite_to_team(uuid, text, text) from public;
revoke all on function public.claim_team_invites() from public;
revoke all on function public.leave_team(uuid) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.invite_to_team(uuid, text, text) to authenticated;
grant execute on function public.claim_team_invites() to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
