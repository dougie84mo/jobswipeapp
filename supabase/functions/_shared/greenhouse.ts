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

import {
  authHeaderBasic,
  callGet,
  callWrite,
  MAX_PAGES,
  PER_PAGE,
  pooledMap,
} from './http.ts';
import {
  deriveYearsExperience,
  type NormEducationEntry,
  type NormExperienceEntry,
  sortMostRecentFirst,
} from './candidate-derive.ts';

const BASE_URL = 'https://harvest.greenhouse.io/v1';

async function call<T>(apiKey: string, path: string): Promise<T> {
  return callGet<T>(
    `${BASE_URL}${path}`,
    { Authorization: authHeaderBasic(apiKey), Accept: 'application/json' },
    { provider: 'Greenhouse', route: path },
  );
}

// One page of Greenhouse's ?page=N&per_page=100 pagination. The opaque cursor
// is just the page number as a string; '' (or undefined-coerced) means page 1.
// nextCursor is the next page number, or null when a short page ends the walk.
async function callOnePage<T>(
  apiKey: string,
  basePath: string,
  cursor: string | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const sep = basePath.includes('?') ? '&' : '?';
  const page = cursor ? Number(cursor) : 1;
  const items = await call<T[]>(
    apiKey,
    `${basePath}${sep}per_page=${PER_PAGE}&page=${page}`,
  );
  return {
    items,
    nextCursor: items.length < PER_PAGE ? null : String(page + 1),
  };
}

// Auto-walks all pages (up to MAX_PAGES) on top of callOnePage so the walk and
// the on-demand single-page path share one implementation.
async function callPaged<T>(apiKey: string, basePath: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    // Annotated to break TS 6's circular-inference check (TS7022) on a generic
    // helper called inside a generic function.
    const { items, nextCursor }: { items: T[]; nextCursor: string | null } =
      await callOnePage<T>(
        apiKey,
        basePath,
        cursor,
      );
    all.push(...items);
    if (!nextCursor) break;
    cursor = nextCursor;
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
  return callWrite<T>(
    `${BASE_URL}${path}`,
    method,
    {
      Authorization: authHeaderBasic(apiKey),
      'On-Behalf-Of': onBehalfOf,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    { provider: 'Greenhouse', route: path },
  );
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
    `/applications?candidate_id=${encodeURIComponent(candidateId)}&job_id=${
      encodeURIComponent(jobId)
    }&status=active&per_page=10`,
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
  experience?: NormExperienceEntry[];
  education?: NormEducationEntry[];
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
  employments?: {
    company_name?: string | null;
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }[];
  educations?: {
    school_name?: string | null;
    degree?: string | null;
    discipline?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }[];
}

function mapEmployments(c: GhCandidate): NormExperienceEntry[] | undefined {
  const entries = (c.employments ?? [])
    .filter((e) => e.title || e.company_name)
    .map((e): NormExperienceEntry => ({
      title: e.title ?? undefined,
      company: e.company_name ?? undefined,
      start: e.start_date ?? undefined,
      end: e.end_date ?? undefined,
    }));
  return entries.length > 0 ? sortMostRecentFirst(entries) : undefined;
}

function mapEducations(c: GhCandidate): NormEducationEntry[] | undefined {
  const entries = (c.educations ?? [])
    .filter((e) => e.school_name)
    .map((e): NormEducationEntry => ({
      school: e.school_name!,
      degree: e.degree ?? undefined,
      field: e.discipline ?? undefined,
      start: e.start_date ?? undefined,
      end: e.end_date ?? undefined,
    }));
  return entries.length > 0 ? sortMostRecentFirst(entries) : undefined;
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

export async function listRequisitions(
  apiKey: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // Open jobs only. No cursor → walk every page (nextCursor null). A cursor
  // (including '') → a single page with the real next-page cursor.
  const map = (j: GhJob): NormRequisition => ({
    externalId: String(j.id),
    title: j.name,
    department: j.departments?.[0]?.name,
    location: j.offices?.[0]?.location?.name ?? j.offices?.[0]?.name,
    raw: j,
  });
  if (cursor === undefined) {
    const jobs = await callPaged<GhJob>(apiKey, '/jobs?status=open');
    return { items: jobs.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<GhJob>(
    apiKey,
    '/jobs?status=open',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // Active applications for a job, then fetch each candidate. Greenhouse
  // doesn't expand candidate detail on the applications endpoint, so this
  // is N+1 by design. The proxy caches result via the requisitions /
  // candidates Postgres tables (record_swipe upserts) so subsequent swipes
  // don't re-pay this cost on the same candidates.
  //
  // Pagination is driven by the applications page; no cursor → walk all
  // (nextCursor null), a cursor → one page of applications + its next cursor.
  const appsPath = `/applications?job_id=${
    encodeURIComponent(jobExternalId)
  }&status=active`;
  let apps: GhApplication[];
  let nextCursor: string | null = null;
  if (cursor === undefined) {
    apps = await callPaged<GhApplication>(apiKey, appsPath);
  } else {
    const page = await callOnePage<GhApplication>(apiKey, appsPath, cursor);
    apps = page.items;
    nextCursor = page.nextCursor;
  }
  const candidates = await pooledMap(
    apps,
    async (app) => {
      const c = await call<GhCandidate>(
        apiKey,
        `/candidates/${app.candidate_id}`,
      );
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ')
        .trim();
      const headlineParts = [c.title, c.company].filter(Boolean);
      const resume = c.attachments?.find(
        (a) =>
          a.type === 'resume' || a.type === 'Resume' || /resume/i.test(a.url),
      );
      const experience = mapEmployments(c);
      return {
        externalId: String(c.id),
        requisitionExternalId: jobExternalId,
        fullName: fullName || `Candidate ${c.id}`,
        headline: headlineParts.join(' • ') || undefined,
        location: c.addresses?.[0]?.value,
        resumeUrl: resume?.url,
        photoUrl: c.photo_url,
        skills: c.tags ?? undefined,
        yearsExperience: deriveYearsExperience(experience),
        experience,
        education: mapEducations(c),
        raw: c,
      } satisfies NormCandidate;
    },
  );
  return { items: candidates, nextCursor };
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
  const { applicationId } = await findActiveApplication(
    apiKey,
    candidateId,
    jobId,
  );
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
