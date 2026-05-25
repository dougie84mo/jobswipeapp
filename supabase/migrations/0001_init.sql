-- Recruit Swipe — initial schema
-- All tables have RLS enabled. Policies scope by user_id (directly or via integrations.user_id).

set check_function_bodies = off;

-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists pgcrypto;
-- Symmetric encryption (pgsodium / Supabase Vault) is wired up in phase 4
-- when integration credentials are first written. For now the
-- `integrations.credentials_encrypted bytea` column just holds opaque bytes;
-- nothing reads or decrypts it yet.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.recruiter_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  org_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_label text,
  -- Will be encrypted in phase 4; currently any non-null bytea is accepted.
  credentials_encrypted bytea not null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create index integrations_user_id_idx on public.integrations (user_id);
create index integrations_provider_idx on public.integrations (provider);

create table public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  direction text not null check (direction in ('right','left','up')),
  actions jsonb not null default '[]'::jsonb,
  unique (integration_id, direction)
);

create table public.requisitions (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_id text not null,
  title text,
  department text,
  location text,
  raw jsonb,
  synced_at timestamptz not null default now(),
  unique (integration_id, external_id)
);

create index requisitions_integration_id_idx on public.requisitions (integration_id);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  external_id text not null,
  full_name text,
  headline text,
  location text,
  resume_url text,
  photo_url text,
  skills text[],
  years_experience numeric,
  raw jsonb,
  synced_at timestamptz not null default now(),
  unique (integration_id, external_id)
);

create index candidates_integration_id_idx on public.candidates (integration_id);
create index candidates_requisition_id_idx on public.candidates (requisition_id);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  requisition_id uuid not null references public.requisitions(id) on delete cascade,
  direction text not null check (direction in ('right','left','up')),
  executed_actions jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, candidate_id)
);

create index swipes_user_id_idx on public.swipes (user_id);
create index swipes_requisition_id_idx on public.swipes (requisition_id);
create index swipes_created_at_idx on public.swipes (created_at desc);

-- ============================================================================
-- Auto-create recruiter_profiles row on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.recruiter_profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.recruiter_profiles enable row level security;
alter table public.integrations         enable row level security;
alter table public.integration_settings enable row level security;
alter table public.requisitions         enable row level security;
alter table public.candidates           enable row level security;
alter table public.swipes               enable row level security;

-- recruiter_profiles: user can read/update their own row only
create policy "recruiter_profiles_self_select"
  on public.recruiter_profiles for select
  using (user_id = auth.uid());

create policy "recruiter_profiles_self_update"
  on public.recruiter_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- integrations: scoped directly by user_id
create policy "integrations_self_all"
  on public.integrations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- integration_settings: scoped via integrations.user_id
create policy "integration_settings_self_all"
  on public.integration_settings for all
  using (
    exists (
      select 1 from public.integrations i
      where i.id = integration_settings.integration_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.integrations i
      where i.id = integration_settings.integration_id and i.user_id = auth.uid()
    )
  );

-- requisitions: scoped via integrations.user_id
create policy "requisitions_self_all"
  on public.requisitions for all
  using (
    exists (
      select 1 from public.integrations i
      where i.id = requisitions.integration_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.integrations i
      where i.id = requisitions.integration_id and i.user_id = auth.uid()
    )
  );

-- candidates: scoped via integrations.user_id
create policy "candidates_self_all"
  on public.candidates for all
  using (
    exists (
      select 1 from public.integrations i
      where i.id = candidates.integration_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.integrations i
      where i.id = candidates.integration_id and i.user_id = auth.uid()
    )
  );

-- swipes: scoped directly by user_id
create policy "swipes_self_all"
  on public.swipes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
