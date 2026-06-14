// Teamtailor API client (Deno).
//
// Docs: https://docs.teamtailor.com (JSON:API spec). Static mirror used to
// verify endpoints: https://teamtailor-docs.netlify.app.
// Auth: `Authorization: Token token=<api key>` plus a dated `X-Api-Version`
// header. Requests/responses use the JSON:API media type.
// Base URL: https://api.teamtailor.com/v1
// Rate limit: 429 with Retry-After, honored by the shared fetchWithBackoff.
//
// Pagination: JSON:API. We request page[size]=30 (Teamtailor's max) and follow
// the absolute `links.next` URL — the same next-URL model as Workable. The
// opaque cursor IS that next URL; '' means the first page.
//
// Model mapping:
// - Teamtailor "job" ↔ our requisition.
// - A candidate reaches a job through a "job-application" (one per candidate per
//   job). We list a job's job-applications (include=candidate) and key each
//   normalized candidate by the JOB-APPLICATION id — so stage/reject writes
//   PATCH that job-application directly with no lookup (same posture as Lever's
//   opportunity id). The underlying candidate id lives in `raw`.
//
// Capabilities shipped in this version: reads + advance stage + reject. Tags,
// notes, messages, and templates are deferred:
// - tags: Teamtailor candidate tags are free-form strings with no list/vocab
//   endpoint, so the settings tag picker would be empty.
// - notes: the activities/notes endpoint requires a Teamtailor `user`
//   relationship we don't capture at connect time (a future extras key, like
//   Greenhouse's on_behalf_of).
// The shell adapter's capabilities() is trimmed to match.

import { callGet, callWrite, MAX_PAGES } from './http.ts';

const BASE_URL = 'https://api.teamtailor.com/v1';
const API_VERSION = '20240904';
const PAGE_SIZE = 30;

function headers(apiKey: string, write = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Token token=${apiKey}`,
    'X-Api-Version': API_VERSION,
    Accept: 'application/vnd.api+json',
  };
  if (write) h['Content-Type'] = 'application/vnd.api+json';
  return h;
}

// ============================================================================
// JSON:API envelope shapes (only the parts we read).
// ============================================================================

interface JsonApiRef {
  id: string;
  type: string;
}
interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: JsonApiRef | JsonApiRef[] | null; links?: { related?: string } }
  >;
}
interface JsonApiList {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: { next?: string | null };
}

// Fetch one page: the first page from `firstUrl`, or the absolute next-URL
// cursor for subsequent pages.
async function getPage(
  apiKey: string,
  firstUrl: string,
  cursor: string | undefined,
): Promise<JsonApiList> {
  const url = cursor ? cursor : firstUrl;
  return callGet<JsonApiList>(url, headers(apiKey), {
    provider: 'Teamtailor',
    route: firstUrl,
  });
}

// Auto-walk every page of a data-only resource (jobs, stages) on links.next.
async function walkAll(
  apiKey: string,
  firstUrl: string,
): Promise<JsonApiResource[]> {
  const all: JsonApiResource[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getPage(apiKey, firstUrl, cursor);
    all.push(...page.data);
    const next = page.links?.next ?? null;
    if (!next) break;
    cursor = next;
  }
  return all;
}

function refId(
  r: JsonApiRef | JsonApiRef[] | null | undefined,
): string | undefined {
  return r && !Array.isArray(r) ? r.id : undefined;
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
// Reads.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  // Lightest authenticated read; a 200 confirms the token + version header.
  await callGet(`${BASE_URL}/jobs?page[size]=1`, headers(apiKey), {
    provider: 'Teamtailor',
    route: '/jobs',
  });
  return true;
}

export async function listRequisitions(
  apiKey: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // Open jobs only. No cursor → walk all pages (nextCursor null); a cursor →
  // one page + the real next-URL cursor.
  const firstUrl =
    `${BASE_URL}/jobs?filter[status]=open&page[size]=${PAGE_SIZE}`;
  const map = (j: JsonApiResource): NormRequisition => ({
    externalId: j.id,
    title: typeof j.attributes?.title === 'string' ? j.attributes.title : '',
    raw: j,
  });
  if (cursor === undefined) {
    const jobs = await walkAll(apiKey, firstUrl);
    return { items: jobs.map(map), nextCursor: null };
  }
  const page = await getPage(apiKey, firstUrl, cursor);
  return { items: page.data.map(map), nextCursor: page.links?.next ?? null };
}

function mapApplicationsPage(
  page: JsonApiList,
  jobExternalId: string,
): NormCandidate[] {
  const candidatesById = new Map<string, JsonApiResource>();
  for (const inc of page.included ?? []) {
    if (inc.type === 'candidates') candidatesById.set(inc.id, inc);
  }
  return page.data.map((app) => {
    const candId = refId(app.relationships?.candidate?.data);
    const a = (candId ? candidatesById.get(candId)?.attributes : undefined) ??
      {};
    const fullName = [a['first-name'], a['last-name']]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .join(' ')
      .trim();
    return {
      // Key by the job-application id: it's the write target for stage/reject.
      externalId: app.id,
      requisitionExternalId: jobExternalId,
      fullName: fullName || `Candidate ${candId ?? app.id}`,
      headline: typeof a.pitch === 'string' ? a.pitch : undefined,
      skills: Array.isArray(a.tags) ? (a.tags as string[]) : undefined,
      raw: { application: app, candidateId: candId ?? null },
    } satisfies NormCandidate;
  });
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // A job's job-applications, with the candidate included so we get names in
  // one round-trip. No cursor → walk all (nextCursor null); a cursor → one
  // page + its next-URL cursor.
  const firstUrl =
    `${BASE_URL}/jobs/${encodeURIComponent(jobExternalId)}/job-applications` +
    `?include=candidate&page[size]=${PAGE_SIZE}`;
  if (cursor === undefined) {
    const all: NormCandidate[] = [];
    let c: string | undefined = '';
    for (let i = 0; i < MAX_PAGES; i++) {
      const page = await getPage(apiKey, firstUrl, c);
      all.push(...mapApplicationsPage(page, jobExternalId));
      const next = page.links?.next ?? null;
      if (!next) break;
      c = next;
    }
    return { items: all, nextCursor: null };
  }
  const page = await getPage(apiKey, firstUrl, cursor);
  return {
    items: mapApplicationsPage(page, jobExternalId),
    nextCursor: page.links?.next ?? null,
  };
}

export async function listStages(
  apiKey: string,
  _jobExternalId: string,
): Promise<NormStage[]> {
  // Teamtailor stages are global to the account, not per-job — listStages
  // ignores the requisition arg, same posture as Lever / Workable.
  const stages = await walkAll(
    apiKey,
    `${BASE_URL}/stages?page[size]=${PAGE_SIZE}`,
  );
  return stages.map((s) => ({
    id: s.id,
    name: typeof s.attributes?.name === 'string' ? s.attributes.name : '',
    order: typeof s.attributes?.['row-order'] === 'number'
      ? (s.attributes['row-order'] as number)
      : undefined,
  }));
}

export function listTags(_apiKey: string): Promise<NormTag[]> {
  // Teamtailor candidate tags are free-form strings with no list/vocab
  // endpoint, so there's nothing to enumerate for the settings tag picker.
  return Promise.resolve([]);
}

// ============================================================================
// Writes — target the job-application directly (externalId is its id).
// ============================================================================

export async function changeStage(
  apiKey: string,
  applicationId: string,
  toStageId: string,
): Promise<void> {
  await callWrite(
    `${BASE_URL}/job-applications/${encodeURIComponent(applicationId)}`,
    'PATCH',
    headers(apiKey, true),
    {
      data: {
        id: applicationId,
        type: 'job-applications',
        relationships: { stage: { data: { id: toStageId, type: 'stages' } } },
      },
    },
    { provider: 'Teamtailor', route: `/job-applications/${applicationId}` },
  );
}

export async function rejectApplication(
  apiKey: string,
  applicationId: string,
  reason: string | undefined,
): Promise<void> {
  // PATCH the job-application with a reject reason. Some Teamtailor setups also
  // expect a move to a rejected stage; the reason attribute is the portable
  // path and should be re-verified against a sandbox before relying on it.
  const attributes: Record<string, unknown> = {};
  if (reason) attributes['reject-reason'] = reason;
  await callWrite(
    `${BASE_URL}/job-applications/${encodeURIComponent(applicationId)}`,
    'PATCH',
    headers(apiKey, true),
    { data: { id: applicationId, type: 'job-applications', attributes } },
    { provider: 'Teamtailor', route: `/job-applications/${applicationId}` },
  );
}
