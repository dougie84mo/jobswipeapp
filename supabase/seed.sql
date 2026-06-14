-- Recruit Swipe — seed data for local supabase dev.
--
-- Run with `supabase db reset` (which applies migrations then this seed).
-- Provides a single mock recruiter + a fake `mock` ATS integration with a few
-- requisitions and candidates so the swipe deck has something to render.
--
-- The mock provider is purely client-side — no edge function calls are made
-- against it. Useful for working on swipe UI without hitting a real ATS.

-- Seed only runs against local dev, so we can hardcode a known UUID.
do $$
declare
  mock_user_id uuid := '00000000-0000-0000-0000-00000000aaaa';
  mock_integration_id uuid;
  mock_req_id uuid;
  mock_secret_id uuid;
begin
  -- Create the auth user. Password is dev-only — never use against a real project.
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
  values (
    mock_user_id,
    'dev@recruitswipe.local',
    crypt('devpassword', gen_salt('bf')),
    now(),
    '{"display_name": "Dev Recruiter"}'::jsonb,
    'authenticated',
    'authenticated'
  )
  on conflict (id) do nothing;

  -- recruiter_profiles row is auto-created by the on_auth_user_created trigger.

  -- Mock integration. Since migration 0006, credentials live in Vault and
  -- integrations references them by secret id (not the old bytea column). The
  -- mock provider never uses the credential — it bypasses the proxy — but the
  -- FK is NOT NULL, so seed a throwaway Vault secret.
  mock_secret_id := vault.create_secret(
    'mock-key', 'integration-mock-seed', 'Local mock ATS dev secret'
  );
  insert into public.integrations (user_id, provider, display_label, credentials_secret_id, status)
  values (mock_user_id, 'mock', 'Local Mock ATS', mock_secret_id, 'active')
  returning id into mock_integration_id;

  -- A few requisitions
  insert into public.requisitions (integration_id, external_id, title, department, location, raw)
  values
    (mock_integration_id, 'req-001', 'Senior Backend Engineer', 'Platform', 'Remote (US)', '{}'::jsonb),
    (mock_integration_id, 'req-002', 'Product Designer',        'Design',   'New York, NY', '{}'::jsonb),
    (mock_integration_id, 'req-003', 'DevOps Lead',             'SRE',      'Remote (Global)', '{}'::jsonb);

  -- Grab one req to attach candidates to
  select id into mock_req_id from public.requisitions
    where integration_id = mock_integration_id and external_id = 'req-001';

  insert into public.candidates (integration_id, requisition_id, external_id, full_name, headline, location, skills, years_experience, raw)
  values
    (mock_integration_id, mock_req_id, 'cand-001', 'Alex Rivera',    'Staff Engineer at Acme',   'Austin, TX',      array['Go','Postgres','Kafka'],        9,   '{}'::jsonb),
    (mock_integration_id, mock_req_id, 'cand-002', 'Priya Shankar',  'Senior Engineer at Globex','San Francisco, CA',array['Rust','gRPC','AWS'],            7,   '{}'::jsonb),
    (mock_integration_id, mock_req_id, 'cand-003', 'Jordan Lee',     'Engineer at Initech',      'Remote (CA)',     array['Node','TypeScript','Postgres'], 5,   '{}'::jsonb);

  -- Default per-direction swipe actions for the mock integration
  insert into public.integration_settings (integration_id, direction, actions) values
    (mock_integration_id, 'right', '[{"type":"local_only"}]'::jsonb),
    (mock_integration_id, 'left',  '[{"type":"local_only"}]'::jsonb),
    (mock_integration_id, 'up',    '[{"type":"local_only"}]'::jsonb);
end$$;
