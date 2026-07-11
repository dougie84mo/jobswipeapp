-- Recruit Swipe — scheduled new-candidate detection.
--
-- The detect-new-candidates edge function (service-role) already does all the
-- work: it scans enabled notification_topics, diffs live ATS candidates against
-- notification_seen, and fires send-push on the delta (0014/0015). What was
-- missing is a trigger to run it on a cadence. This migration wires that with
-- pg_cron + pg_net: a job POSTs to the function every 15 minutes.
--
-- ── One-time setup required before the job can authenticate ──────────────────
-- The function is service-role-gated, so the cron job needs the service-role key
-- as a Bearer token. The key is NOT stored in this migration (never commit it).
-- Run ONCE (from the SQL editor / a privileged session), substituting the real
-- key from Supabase → Settings → API → service_role:
--
--     select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--
-- The cron command reads it at run time from vault.decrypted_secrets, so it can
-- be set before or after this migration — just before the next tick. Until the
-- secret exists the job simply 403s (harmless no-op).
--
-- Idempotent: extensions use `if not exists`; cron.schedule() upserts by job
-- name, so re-applying just refreshes the schedule/command.

-- pg_net (async HTTP, schema `net`) and pg_cron (scheduler, schema `cron`).
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Run detect-new-candidates every 15 minutes. The function itself no-ops when
-- there are no enabled topics, so an idle account costs one cheap POST/tick.
select cron.schedule(
  'detect-new-candidates',
  '*/15 * * * *',
  $$
    select net.http_post(
      url     := 'https://lbhikadtsmbnzkzetpyb.supabase.co/functions/v1/detect-new-candidates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
        )
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- To inspect / undo later:
--   select * from cron.job;                                    -- registered jobs
--   select * from cron.job_run_details order by start_time desc limit 10;  -- history
--   select cron.unschedule('detect-new-candidates');           -- remove the job
