// Greenhouse Harvest API client (Deno).
//
// Reads and writes. Writes need the recruiter's Greenhouse user id passed as
// the On-Behalf-Of header — Greenhouse uses it to attribute the action and
// permission-check. Captured at connect time and stored on
// integrations.on_behalf_of_user_id; the ats-proxy reads it back before
// dispatching a write.
//
// Docs: https://developers.greenhouse.io/harvest.html
// Auth: Basic with `${apiKey}:` (note the trailing colon — Greenhouse uses
// the API key as the username and empty as the password).
// Rate limit: 429 with Retry-After (seconds). fetchWithBackoff retries up
// to MAX_RETRY_ATTEMPTS times, sleeping the server-advised duration between
// attempts. Paginated reads (jobs, applications, tags) auto-walk pages up
// to MAX_PAGES; the proxy returns a single combined array so the UI
// doesn't need a cursor surface yet.

const BASE_URL = 'https://harvest.greenhouse.io/v1';
const MAX_PAGES = 10;
const PER_PAGE = 100;
const MAX_RETRY_ATTEMPTS = 3;

function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

async function fetchWithBackoff(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get('Retry-After')) || 1;
    // Drain the body so the connection can be reused.
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  // Exhausted retries — let the last attempt's response flow through so the
  // caller surfaces the real 429 (with whatever body Greenhouse returns).
  return fetch(url, init);
}

async function call<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetchWithBackoff(`${BASE_URL}${path}`, {
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

// Walks ?page=N&per_page=100 until a short page or MAX_PAGES is hit.
// basePath can already contain query params; we append the page params with
// the right separator.
async function callPaged<T>(apiKey: string, basePath: string): Promise<T[]> {
  const all: T[] = [];
  const sep = basePath.includes('?') ? '&' : '?';
  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await call<T[]>(
      apiKey,
      `${basePath}${sep}per_page=${PER_PAGE}&page=${page}`,
    );
    all.push(...items);
    if (items.length < PER_PAGE) break;
  }
  return all;
}

async function write<T>(
  apiKey: string,
  onBehalfOf: string,
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetchWithBackoff(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(apiKey),
      'On-Behalf-Of': onBehalfOf,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const respBody = await res.text().catch(() => '');
    throw new Error(
      `Greenhouse ${res.status} ${res.statusText} for ${method} ${path}${respBody ? `: ${respBody}` : ''}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Most Greenhouse writes target an application_id, but the app passes us
// (candidate_id, job_id). Find the candidate's active application on the
// given job. Returns the application id and its current stage id.
async function findActiveApplication(
  apiKey: string,
  candidateId: string,
  jobId: string,
): Promise<{ applicationId: string; currentStageId: string | null }> {
  const apps = await call<GhApplication[]>(
    apiKey,
    `/applications?candidate_id=${encodeURIComponent(candidateId)}&job_id=${encodeURIComponent(jobId)}&status=active&per_page=10`,
  );
  if (apps.length === 0) {
    throw new Error(
      `Greenhouse: no active application for candidate ${candidateId} on job ${jobId}`,
    );
  }
  // Greenhouse returns at most one active app per (candidate, job) pair.
  const app = apps[0]!;
  return {
    applicationId: String(app.id),
    currentStageId: app.current_stage ? String(app.current_stage.id) : null,
  };
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
  // Open jobs only. Walks pages until we run out (or MAX_PAGES).
  const jobs = await callPaged<GhJob>(apiKey, '/jobs?status=open');
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
  const apps = await callPaged<GhApplication>(
    apiKey,
    `/applications?job_id=${encodeURIComponent(jobExternalId)}&status=active`,
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
  const tags = await callPaged<GhTag>(apiKey, '/tags');
  return tags.map((t) => ({ id: String(t.id), name: t.name }));
}

// ============================================================================
// Writes — all require On-Behalf-Of.
// ============================================================================

export async function advanceStage(
  apiKey: string,
  onBehalfOf: string,
  candidateId: string,
  jobId: string,
  toStageId: string,
): Promise<void> {
  const { applicationId, currentStageId } = await findActiveApplication(
    apiKey,
    candidateId,
    jobId,
  );
  if (!currentStageId) {
    throw new Error(
      `Greenhouse: application ${applicationId} has no current stage to move from`,
    );
  }
  await write<unknown>(
    apiKey,
    onBehalfOf,
    'POST',
    `/applications/${applicationId}/move`,
    { from_stage_id: Number(currentStageId), to_stage_id: Number(toStageId) },
  );
}

export async function rejectApplication(
  apiKey: string,
  onBehalfOf: string,
  candidateId: string,
  jobId: string,
  reasonId: string | undefined,
): Promise<void> {
  const { applicationId } = await findActiveApplication(apiKey, candidateId, jobId);
  const body: Record<string, unknown> = {};
  if (reasonId) body.rejection_reason_id = Number(reasonId);
  await write<unknown>(
    apiKey,
    onBehalfOf,
    'POST',
    `/applications/${applicationId}/reject`,
    body,
  );
}

export async function addCandidateNote(
  apiKey: string,
  onBehalfOf: string,
  candidateId: string,
  noteBody: string,
): Promise<void> {
  await write<unknown>(
    apiKey,
    onBehalfOf,
    'POST',
    `/candidates/${candidateId}/notes`,
    { body: noteBody, visibility: 'public' },
  );
}

export async function applyCandidateTag(
  apiKey: string,
  onBehalfOf: string,
  candidateId: string,
  tagId: string,
): Promise<void> {
  await write<unknown>(
    apiKey,
    onBehalfOf,
    'PUT',
    `/candidates/${candidateId}/tags`,
    { tag_id: Number(tagId) },
  );
}
