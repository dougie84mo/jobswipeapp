// Edge function: website-lead
//
// Receives the three enquiry forms on the marketing site
// (recruiterswipe.com — separate repo `recruiter-swipe-website`), stores the
// row in public.website_leads, and emails a notification via Resend.
//
// The site is a static build on Hostinger with no backend, so this function is
// its only server. It runs with verify_jwt = false (config.toml) because the
// visitors are anonymous — the anon key the browser sends is public and proves
// nothing. What actually gates writes:
//
//   1. Origin allowlist — only the marketing site (and localhost in dev).
//   2. Honeypot field (`company_website`) — populated means a bot.
//   3. Time-on-form — a human cannot complete these in under ~2.5s.
//   4. Per-IP rate limit — a short in-memory window per isolate.
//   5. Field size caps — nothing unbounded reaches the database.
//
// None of these are strong alone; together they stop the drive-by spam that a
// public endpoint attracts. The table has RLS enabled with no policies, so
// this function (service role) is the only writer and nothing client-side can
// read what lands there.
//
// Calling shape (POST JSON):
//   {
//     "kind": "partner_ats" | "recruiter_early_access" | "contact",
//     "source_page": "/early-access",
//     "elapsed_ms": 8123,
//     "min_elapsed_ms": 2500,
//     "fields": { "name": "...", "email": "...", ... }
//   }
//
// Response: { ok: true } — deliberately uninformative about which check
// rejected a submission.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

type LeadKind = 'partner_ats' | 'recruiter_early_access' | 'contact';

interface RequestBody {
  kind?: string;
  source_page?: string;
  elapsed_ms?: number;
  fields?: Record<string, unknown>;
}

const LEAD_KINDS: readonly LeadKind[] = [
  'partner_ats',
  'recruiter_early_access',
  'contact',
];

const ALLOWED_ORIGINS = [
  'https://recruiterswipe.com',
  'https://www.recruiterswipe.com',
  'http://localhost:4321',
  'http://localhost:4322',
];

/** A human filling in even the shortest of these forms takes longer. */
const MIN_ELAPSED_MS = 2500;

/** Per-IP allowance. Isolates are short-lived, so this is a speed bump. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const MAX_FIELD_LENGTH = 4000;
const MAX_FIELDS = 20;

const KIND_LABELS: Record<LeadKind, string> = {
  partner_ats: 'ATS partner enquiry',
  recruiter_early_access: 'Early access request',
  contact: 'Contact form',
};

const recentByIp = new Map<string, number[]>();

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recentByIp.get(ip) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );
  hits.push(now);
  recentByIp.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

/** Trim, cap, and drop anything that is not a usable string. */
function cleanFields(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(out).length >= MAX_FIELDS) break;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    out[key.slice(0, 64)] = trimmed.slice(0, MAX_FIELD_LENGTH);
  }
  return out;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function notify(
  kind: LeadKind,
  fields: Record<string, string>,
  sourcePage: string | null,
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('LEAD_NOTIFY_EMAIL');
  const from = Deno.env.get('LEAD_FROM_EMAIL') ??
    'Recruit Swipe <notifications@recruiterswipe.com>';
  if (!apiKey || !to) return;

  const rows = Object.entries(fields)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#666">${
          escapeHtml(key)
        }</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: fields.email,
      subject: `${KIND_LABELS[kind]} — ${
        fields.company ?? fields.name ?? fields.email
      }`,
      html: `<p style="font:14px system-ui">${KIND_LABELS[kind]}${
        sourcePage ? ` from ${escapeHtml(sourcePage)}` : ''
      }</p><table style="font:14px system-ui;border-collapse:collapse">${rows}</table>`,
    }),
  });

  if (!response.ok) {
    // The row is already stored; a failed notification must not fail the
    // request, but it should be visible in the function logs.
    console.error(
      'website-lead: resend failed',
      response.status,
      await response.text(),
    );
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'Forbidden' }, 403, origin);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Too many requests' }, 429, origin);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin);
  }

  const kind = body.kind as LeadKind | undefined;
  if (!kind || !LEAD_KINDS.includes(kind)) {
    return json({ error: 'Unknown form' }, 400, origin);
  }

  const fields = cleanFields(body.fields ?? {});

  // Honeypot: hidden from people, irresistible to bots.
  if (fields.company_website) {
    return json({ ok: true }, 200, origin);
  }
  delete fields.company_website;

  // Too fast to have been typed.
  if (typeof body.elapsed_ms === 'number' && body.elapsed_ms < MIN_ELAPSED_MS) {
    return json({ ok: true }, 200, origin);
  }

  const email = fields.email;
  if (!email || !looksLikeEmail(email)) {
    return json({ error: 'A valid email address is required' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('website-lead: missing SUPABASE_URL/SERVICE_ROLE_KEY');
    return json({ error: 'Server not configured' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const sourcePage = typeof body.source_page === 'string'
    ? body.source_page.slice(0, 200)
    : null;

  const { error } = await supabase.from('website_leads').insert({
    kind,
    email,
    name: fields.name ?? null,
    company: fields.company ?? null,
    fields,
    source_page: sourcePage,
    user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
  });

  if (error) {
    console.error('website-lead: insert failed', error.message);
    return json({ error: 'Could not store that' }, 500, origin);
  }

  await notify(kind, fields, sourcePage);

  return json({ ok: true }, 200, origin);
});
