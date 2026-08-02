-- Recruit Swipe — enquiries submitted from the marketing site.
--
-- The site (recruiterswipe.com, separate repo `recruiter-swipe-website`) is a
-- static build on Hostinger with no backend of its own, so its three forms
-- POST to the `website-lead` edge function, which is the SOLE writer of this
-- table via the service role.
--
-- Deliberately NOT user-scoped: these arrive from anonymous visitors and have
-- no auth.users row to attach to. RLS is enabled with **no policies at all**,
-- which denies every authenticated and anon client outright — the service role
-- bypasses RLS, so only the edge function (and the admin panel, which reads
-- through admin-api under the service role) can see them.
--
-- `fields` holds the form's own answers rather than a column per question, so
-- adding a field to a form does not need a migration. The columns that ARE
-- promoted (email, name, company) are the ones we filter and dedupe on.

create table public.website_leads (
  id uuid primary key default gen_random_uuid(),
  -- Which form this came from.
  kind text not null check (
    kind in ('partner_ats', 'recruiter_early_access', 'contact')
  ),
  email text not null,
  name text,
  company text,
  -- The remaining answers, verbatim.
  fields jsonb not null default '{}'::jsonb,
  -- Where on the site it was submitted, for attribution.
  source_page text,
  user_agent text,
  -- Set by hand when someone has actually been replied to.
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- The admin view is "newest first, filtered by kind".
create index website_leads_kind_created_idx
  on public.website_leads (kind, created_at desc);

-- Spotting a repeat enquiry from the same person.
create index website_leads_email_idx
  on public.website_leads (lower(email));

alter table public.website_leads enable row level security;

-- No policies by design. Every client-side role is denied; the edge function
-- writes with the service role, which bypasses RLS.

comment on table public.website_leads is
  'Enquiries from recruiterswipe.com. Written only by the website-lead edge function (service role). RLS enabled with no policies: no client can read or write.';
