-- Recruit Swipe — generic per-user UI / behavior prefs.
--
-- notification_prefs is reserved for notification-channel settings (push,
-- email, future quiet-hours). UI behavior settings like gesture-swiping
-- belong in their own bucket so the two stay independently auditable.
-- app_prefs is jsonb so future toggles (haptics, deck stack size, theme
-- override) land here without another migration.

alter table public.recruiter_profiles
  add column if not exists app_prefs jsonb not null default '{"gesture_swiping": false}'::jsonb;
