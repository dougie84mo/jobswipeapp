-- Recruit Swipe — per-member swipe-action settings for shared connections.
--
-- integration_settings was keyed (integration_id, direction) with ownership
-- implied through integrations.user_id. With team-shared connections each
-- member needs their own action config, and the owner's rows double as the
-- team defaults members inherit until they save an override.
--
-- Change: settings rows gain an explicit user_id (backfilled from the
-- integration owner), unique key becomes (integration_id, direction,
-- user_id). Inheritance is resolved app-side (features/integrations/
-- settings.ts): the member's row for a direction wins, else the owner's.
--
-- ⚠️ App coordination: the settings upsert's onConflict target changes to
-- 'integration_id,direction,user_id' — ship the app change with this
-- migration.

alter table public.integration_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.integration_settings s
set user_id = i.user_id
from public.integrations i
where i.id = s.integration_id and s.user_id is null;

alter table public.integration_settings
  alter column user_id set not null;

alter table public.integration_settings
  drop constraint if exists integration_settings_integration_id_direction_key;

alter table public.integration_settings
  add constraint integration_settings_integration_direction_user_key
  unique (integration_id, direction, user_id);

create index if not exists integration_settings_user_id_idx
  on public.integration_settings (user_id);

-- ============================================================================
-- RLS: replace the single owner policy.
--   1. Full control over YOUR OWN rows on any integration you can use
--      (owned or team-shared).
--   2. Read the OWNER's rows on a shared integration — those are the team
--      defaults members inherit. Other members' personal rows stay private.
-- ============================================================================

drop policy if exists "integration_settings_self_all" on public.integration_settings;

create policy "integration_settings_own_rows_all"
  on public.integration_settings for all
  using (
    user_id = auth.uid() and public.can_use_integration(integration_id)
  )
  with check (
    user_id = auth.uid() and public.can_use_integration(integration_id)
  );

create policy "integration_settings_team_defaults_select"
  on public.integration_settings for select
  using (
    exists (
      select 1 from public.integrations i
      where i.id = integration_settings.integration_id
        and i.shared_team_id is not null
        and i.user_id = integration_settings.user_id  -- owner's rows only
        and public.is_team_member(i.shared_team_id)
    )
  );
