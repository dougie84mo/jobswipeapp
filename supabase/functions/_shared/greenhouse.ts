// Greenhouse Harvest API client (Deno).
//
// Read methods only for the first cut. Writes (move stage, reject, add note,
// apply tag) all require Greenhouse's On-Behalf-Of header pointing at a
// Greenhouse user id, which we don't capture yet — added in a follow-up.
//
// Docs: https://developers.greenhouse.io/harvest.html
// Auth: Basic with `${apiKey}:` (note the trailing colon — Greenhouse uses
// the API key as the username and empty as the password).
// Rate limit: surfaced via X-RateLimit-Limit / X-RateLimit-Remaining. 429
// includes Retry-After. Today the proxy passes errors through; back-off is
// a follow-up.

const BASE_URL = 'https://harvest.greenhouse.io/v1';

function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

async function call<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader(apiKey),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Greenhouse ${res.status} ${res.statusText} for ${path}${body ? `: ${body}` : ''}`,
    );
  }
  return (await res.json()) as T;
}

// ============================================================================
// Normalized shapes — match src/ats/types.ts exactly so the mobile app can
// consume Greenhouse and mock responses interchangeably.
// ============================================================================

export interface NormRequisition {
  externalId: string;
  title: string;
  department?: string;
  location?: string;
  raw: unknown;
}
export interface NormCandidate {
  externalId: string;
  requisitionExternalId: string;
  fullName: string;
  headline?: string;
  location?: string;
  resumeUrl?: string;
  photoUrl?: string;
  skills?: string[];
  yearsExperience?: number;
  raw: unknown;
}
export interface NormStage {
  id: string;
  name: string;
  order?: number;
}
export interface NormTag {
  id: string;
  name: string;
}
export interface NormPage<T> {
  items: T[];
  nextCursor: string | null;
}

// ============================================================================
// Greenhouse response shapes — only the fields we actually read.
// ============================================================================

interface GhJob {
  id: number;
  name: string;
  status: string;
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string; location?: { name: string } }[];
}
interface GhStage {
  id: number;
  name: string;
  active: boolean;
  priority?: number;
}
interface GhTag {
  id: number;
  name: string;
}
interface GhApplication {
  id: number;
  candidate_id: number;
  status: string;
  current_stage?: { id: number; name: string };
  jobs?: { id: number; name: string }[];
}
interface GhCandidate {
  id: number;
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;
  addresses?: { value: string }[];
  attachments?: { type: string; url: string }[];
  photo_url?: string;
  tags?: string[];
  applications?: { id: number; jobs?: { id: number; name: string }[] }[];
}

// ============================================================================
// Public methods — one per ATS adapter read.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  // /candidates is the lightest authenticated endpoint Greenhouse exposes;
  // a 200 confirms the API key works.
  await call<unknown>(apiKey, '/candidates?per_page=1');
  return true;
}

export async function listRequisitions(apiKey: string): Promise<NormPage<NormRequisition>> {
  // Open jobs only. per_page maxes at 500 but we cap at 100 to keep payloads
  // sane; pagination follows in a follow-up commit alongside cursor support.
  const jobs = await call<GhJob[]>(apiKey, '/jobs?status=open&per_page=100');
  return {
    items: jobs.map((j) => ({
      externalId: String(j.id),
      title: j.name,
      department: j.departments?.[0]?.name,
      location: j.offices?.[0]?.location?.name ?? j.offices?.[0]?.name,
      raw: j,
    })),
    nextCursor: null,
  };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
): Promise<NormPage<NormCandidate>> {
  // Active applications for a job, then fetch each candidate. Greenhouse
  // doesn't expand candidate detail on the applications endpoint, so this
  // is N+1 by design. The proxy caches result via the requisitions /
  // candidates Postgres tables (record_swipe upserts) so subsequent swipes
  // don't re-pay this cost on the same candidates.
  const apps = await call<GhApplication[]>(
    apiKey,
    `/applications?job_id=${encodeURIComponent(jobExternalId)}&status=active&per_page=50`,
  );
  const candidates = await Promise.all(
    apps.map(async (app) => {
      const c = await call<GhCandidate>(apiKey, `/candidates/${app.candidate_id}`);
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
      const headlineParts = [c.title, c.company].filter(Boolean);
      const resume = c.attachments?.find(
        (a) => a.type === 'resume' || a.type === 'Resume' || /resume/i.test(a.url),
      );
      return {
        externalId: String(c.id),
        requisitionExternalId: jobExternalId,
        fullName: fullName || `Candidate ${c.id}`,
        headline: headlineParts.join(' • ') || undefined,
        location: c.addresses?.[0]?.value,
        resumeUrl: resume?.url,
        photoUrl: c.photo_url,
        skills: c.tags ?? undefined,
        raw: c,
      } satisfies NormCandidate;
    }),
  );
  return { items: candidates, nextCursor: null };
}

export async function listStages(
  apiKey: string,
  jobExternalId: string,
): Promise<NormStage[]> {
  const stages = await call<GhStage[]>(
    apiKey,
    `/jobs/${encodeURIComponent(jobExternalId)}/stages`,
  );
  return stages
    .filter((s) => s.active)
    .map((s) => ({ id: String(s.id), name: s.name, order: s.priority }));
}

export async function listTags(apiKey: string): Promise<NormTag[]> {
  const tags = await call<GhTag[]>(apiKey, '/tags?per_page=200');
  return tags.map((t) => ({ id: String(t.id), name: t.name }));
}
