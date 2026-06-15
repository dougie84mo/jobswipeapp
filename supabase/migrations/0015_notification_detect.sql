-- Recruit Swipe — server-side plumbing for new-candidate detection.
--
-- The detect-new-candidates edge function (service-role, like send-push) scans
-- every enabled notification_topics row, lists the live ATS candidates for that
-- requisition, and alerts on genuinely NEW arrivals.
--
-- Why a dedicated seen-set (not the candidates cache): public.candidates only
-- holds candidates the recruiter has *swiped* (record_swipe upserts them), so
-- it can't tell "newly arrived" from "not yet swiped" — using it would re-alert
-- on every unswiped candidate. notification_seen tracks, per topic, which
-- candidate external ids we've already accounted for. The first scan of a topic
-- seeds the baseline WITHOUT notifying; later scans alert only on the delta.

-- Null until the detect function's first pass over a topic. Baseline (no
-- alerts) happens exactly when this is null — distinct from "seen-set is empty",
-- which would mis-fire if a topic had zero candidates on its first scan and got
-- real ones later.
alter table public.notification_topics
  add column last_scanned_at timestamptz;

create table public.notification_seen (
  topic_id uuid not null references public.notification_topics(id) on delete cascade,
  candidate_external_id text not null,
  seen_at timestamptz not null default now(),
  primary key (topic_id, candidate_external_id)
);

-- Internal tracking — only the service-role edge function touches it. RLS on
-- with no policies locks it to service_role (which bypasses RLS).
alter table public.notification_seen enable row level security;

-- One row per enabled topic with everything the detect function needs,
-- including the decrypted credential. SECURITY DEFINER + granted ONLY to
-- service_role (not anon/authenticated), so only the trusted edge functions —
-- which already hold the service-role key — can decrypt. No new capability
-- beyond what the service role can already do via SQL; this just packages it.
create or replace function public.read_pending_notification_scans()
returns table (
  topic_id uuid,
  user_id uuid,
  integration_id uuid,
  provider text,
  extras jsonb,
  requisition_external_id text,
  credentials text,
  last_scanned_at timestamptz
)
language sql
security definer
set search_path = public, vault
as $$
  select
    t.id,
    t.user_id,
    t.integration_id,
    i.provider,
    i.extras,
    t.requisition_external_id,
    (
      select v.decrypted_secret
      from vault.decrypted_secrets v
      where v.id = i.credentials_secret_id
    ),
    t.last_scanned_at
  from public.notification_topics t
  join public.integrations i on i.id = t.integration_id
  where t.enabled;
$$;

revoke all on function public.read_pending_notification_scans() from public, anon, authenticated;
grant execute on function public.read_pending_notification_scans() to service_role;
