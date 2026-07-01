// JazzHR (Resumator) API client (Deno).
//
// Docs: https://www.getknit.dev/blog/jazzhr-ats-api-directory + JazzHR help
// center (API Overview). The public v1 API is https://api.resumatorapi.com/v1.
// Auth: the API key is passed as an `apikey` query parameter on every request
// (the canonical v1 auth — there is no header token for the v1 read API).
// Plan gate: JazzHR exposes the API on Pro plans and above.
//
// Pagination: JazzHR caps every response at 100 rows and pages via a `/page/{n}`
// path segment (1-based) appended to the resource — there is NO next-cursor or
// total field in the body, so "this page returned a full 100" is the only
// signal that another page may exist. The opaque cursor is the page number.
//
// Model mapping:
// - JazzHR "job" ↔ our requisition.
// - "applicant" ↔ our candidate. A job's applicants are fetched with
//   GET /applicants?job_id={jobId}; the candidate externalId is the applicant
//   id.
//
// SHIPPED READ-ONLY (capabilities() all false), same posture as Manatal. Writes
// are deferred on purpose: JazzHR's v1 write surface is under-specified and
// sources conflict on the request format (apikey query param vs Bearer header;
// JSON vs form-encoded), there is no free sandbox to verify against, and:
// - advance stage: there's no status-update endpoint and no endpoint that LISTS
//   workflow steps, so the settings stage picker would be empty anyway.
// - notes/tags: POST /notes and category mappings exist but their exact bodies
//   are unverified.
// Promote to writes once confirmed against a Pro-plan account.

import { callGet, MAX_PAGES } from './http.ts';

const BASE_URL = 'https://api.resumatorapi.com/v1';
// JazzHR's fixed server-side page size. A full page is the only hint that more
// rows exist (no cursor/total in the response).
const JAZZHR_PAGE_SIZE = 100;

function pageUrl(
  apiKey: string,
  resource: string,
  page: number,
  params: Record<string, string> = {},
): string {
  const qs = new URLSearchParams(params);
  qs.set('apikey', apiKey);
  return `${BASE_URL}${resource}/page/${page}?${qs.toString()}`;
}

async function getArray<T>(
  apiKey: string,
  resource: string,
  page: number,
  params: Record<string, string> = {},
): Promise<T[]> {
  const res = await callGet<T[] | null>(
    pageUrl(apiKey, resource, page, params),
    { Accept: 'application/json' },
    { provider: 'JazzHR', route: resource },
  );
  // JazzHR returns a bare JSON array; guard against a null/empty body.
  return Array.isArray(res) ? res : [];
}

// ============================================================================
// Normalized shapes — match src/ats/types.ts.
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
// JazzHR response shapes — only the fields we read.
// ============================================================================

interface JazzJob {
  id: string;
  title?: string;
  status?: string;
  department?: string;
  city?: string;
  state?: string;
}
interface JazzApplicant {
  id: string;
  first_name?: string;
  last_name?: string;
  job_id?: string;
  job_title?: string;
}

function joinLoc(city?: string, state?: string): string | undefined {
  const parts = [city, state].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// ============================================================================
// Reads.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  // Lightest authenticated read — a 200 with an array body confirms the key.
  await getArray<JazzJob>(apiKey, '/jobs', 1);
  return true;
}

export async function listRequisitions(
  apiKey: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  const map = (j: JazzJob): NormRequisition => ({
    externalId: String(j.id),
    title: j.title ?? '',
    department: j.department,
    location: joinLoc(j.city, j.state),
    raw: j,
  });
  // Keep open reqs for sourcing; jobs whose status we can't read are kept
  // rather than dropped (same posture as BambooHR).
  const keep = (j: JazzJob): boolean => {
    const s = j.status?.toLowerCase();
    return s === undefined || s === 'open';
  };
  // No cursor → walk every page (nextCursor null); a cursor → one page + the
  // next page-number cursor when the page came back full.
  if (cursor === undefined) {
    const all: JazzJob[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await getArray<JazzJob>(apiKey, '/jobs', page);
      all.push(...batch);
      if (batch.length < JAZZHR_PAGE_SIZE) break;
    }
    return { items: all.filter(keep).map(map), nextCursor: null };
  }
  const page = cursor.length > 0 ? Number(cursor) : 1;
  const batch = await getArray<JazzJob>(apiKey, '/jobs', page);
  return {
    items: batch.filter(keep).map(map),
    nextCursor: batch.length === JAZZHR_PAGE_SIZE ? String(page + 1) : null,
  };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  const params = { job_id: jobId };
  const map = (a: JazzApplicant): NormCandidate => {
    const fullName = [a.first_name, a.last_name]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .join(' ')
      .trim();
    return {
      externalId: String(a.id),
      requisitionExternalId: jobId,
      fullName: fullName || `Candidate ${a.id}`,
      raw: a,
    };
  };
  if (cursor === undefined) {
    const all: JazzApplicant[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await getArray<JazzApplicant>(
        apiKey,
        '/applicants',
        page,
        params,
      );
      all.push(...batch);
      if (batch.length < JAZZHR_PAGE_SIZE) break;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const page = cursor.length > 0 ? Number(cursor) : 1;
  const batch = await getArray<JazzApplicant>(
    apiKey,
    '/applicants',
    page,
    params,
  );
  return {
    items: batch.map(map),
    nextCursor: batch.length === JAZZHR_PAGE_SIZE ? String(page + 1) : null,
  };
}

export function listStages(
  _apiKey: string,
  _jobId: string,
): Promise<NormStage[]> {
  // No endpoint enumerates JazzHR workflow steps, and advance-stage isn't
  // supported (capabilities().canAdvanceStage is false), so there's nothing to
  // surface for the settings stage picker.
  return Promise.resolve([]);
}

export function listTags(_apiKey: string): Promise<NormTag[]> {
  // Category-as-tag mapping is deferred (see file header) — nothing to list.
  return Promise.resolve([]);
}
