// Manatal Open API v3 client (Deno).
//
// Docs: https://developers.manatal.com (DRF-style REST API).
// Auth: `Authorization: Token <api key>` (Django REST Framework TokenAuth).
// Base URL: https://api.manatal.com/open/v3
// Rate limit: 429 with Retry-After, honored by the shared fetchWithBackoff.
//
// Pagination: DRF page pagination — responses are
// `{ count, next, previous, results }` where `next` is an absolute URL (or
// null). Same next-URL model as Workable / Teamtailor; the opaque cursor IS
// that next URL ('' = first page).
//
// Model mapping:
// - Manatal "job" ↔ our requisition. Title is `position_name`.
// - A candidate reaches a job through a "match" (GET /jobs/{id}/matches/). We
//   key each normalized candidate by the MATCH id (the future write target);
//   the candidate may be embedded on the match or referenced by id, so we
//   resolve both. Stage names come from /match-stages/.
//
// SCOPE: reads only in this version. Capabilities() on the shell adapter report
// every write as false. Writes (advance stage / reject / tag / note) are
// deferred because Manatal exposes two competing stage concepts (`stage` vs
// `job_pipeline_stage`, /match-stages/ vs a match's per-job
// job_pipeline_stages) and the docs don't pin down which id a PATCH
// /matches/{id}/ expects — that must be confirmed against a live sandbox before
// we write back, to avoid silently no-op'ing swipe actions.

import { callGet, MAX_PAGES, pooledMap } from './http.ts';

const BASE_URL = 'https://api.manatal.com/open/v3';

function headers(apiKey: string): Record<string, string> {
  return { Authorization: `Token ${apiKey}`, Accept: 'application/json' };
}

interface DrfPage<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

async function getPage<T>(
  apiKey: string,
  firstUrl: string,
  cursor: string | undefined,
): Promise<DrfPage<T>> {
  const url = cursor ? cursor : firstUrl;
  return callGet<DrfPage<T>>(url, headers(apiKey), {
    provider: 'Manatal',
    route: firstUrl,
  });
}

async function walkAll<T>(apiKey: string, firstUrl: string): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await getPage<T>(apiKey, firstUrl, cursor);
    all.push(...(page.results ?? []));
    const next = page.next ?? null;
    if (!next) break;
    cursor = next;
  }
  return all;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
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
// Manatal response shapes — only the fields we read.
// ============================================================================

interface ManatalJob {
  id: number;
  position_name?: string;
  status?: string;
  address?: string;
}
interface ManatalCandidate {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}
interface ManatalMatch {
  id: number;
  candidate?: number | ManatalCandidate | null;
  stage?: { name?: string } | null;
}
interface ManatalStage {
  id: number;
  name?: string;
  rank?: number;
}

// ============================================================================
// Reads.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  await callGet(`${BASE_URL}/jobs/?page_size=1`, headers(apiKey), {
    provider: 'Manatal',
    route: '/jobs/',
  });
  return true;
}

export async function listRequisitions(
  apiKey: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // status=open is a best-effort server filter; an unknown query param is
  // ignored by DRF rather than erroring, so this is safe either way.
  const firstUrl = `${BASE_URL}/jobs/?status=open`;
  const map = (j: ManatalJob): NormRequisition => ({
    externalId: String(j.id),
    title: str(j.position_name) ?? `Job ${j.id}`,
    location: str(j.address),
    raw: j,
  });
  if (cursor === undefined) {
    const jobs = await walkAll<ManatalJob>(apiKey, firstUrl);
    return { items: jobs.map(map), nextCursor: null };
  }
  const page = await getPage<ManatalJob>(apiKey, firstUrl, cursor);
  return {
    items: (page.results ?? []).map(map),
    nextCursor: page.next ?? null,
  };
}

async function resolveCandidate(
  apiKey: string,
  ref: number | ManatalCandidate | null | undefined,
): Promise<ManatalCandidate | null> {
  if (ref == null) return null;
  if (typeof ref === 'object') return ref;
  // Embedded as an id — fetch the candidate record.
  return callGet<ManatalCandidate>(
    `${BASE_URL}/candidates/${ref}/`,
    headers(apiKey),
    {
      provider: 'Manatal',
      route: '/candidates/',
    },
  );
}

async function mapMatches(
  apiKey: string,
  matches: ManatalMatch[],
  jobExternalId: string,
): Promise<NormCandidate[]> {
  return pooledMap(
    matches,
    async (m) => {
      const c = await resolveCandidate(apiKey, m.candidate);
      const fullName = str(c?.full_name) ??
        [str(c?.first_name), str(c?.last_name)].filter(Boolean).join(' ')
          .trim();
      return {
        // Key by the match id — the future write target for stage changes.
        externalId: String(m.id),
        requisitionExternalId: jobExternalId,
        fullName: fullName || `Candidate ${c?.id ?? m.id}`,
        raw: { match: m, candidate: c },
      } satisfies NormCandidate;
    },
  );
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // A job's matches; the candidate is embedded or referenced by id (resolved
  // in mapMatches). No cursor → walk all (nextCursor null); a cursor → one
  // page + its next-URL cursor.
  const firstUrl = `${BASE_URL}/jobs/${
    encodeURIComponent(jobExternalId)
  }/matches/`;
  if (cursor === undefined) {
    const all: NormCandidate[] = [];
    let c: string | undefined = '';
    for (let i = 0; i < MAX_PAGES; i++) {
      const page = await getPage<ManatalMatch>(apiKey, firstUrl, c);
      all.push(
        ...(await mapMatches(apiKey, page.results ?? [], jobExternalId)),
      );
      const next = page.next ?? null;
      if (!next) break;
      c = next;
    }
    return { items: all, nextCursor: null };
  }
  const page = await getPage<ManatalMatch>(apiKey, firstUrl, cursor);
  return {
    items: await mapMatches(apiKey, page.results ?? [], jobExternalId),
    nextCursor: page.next ?? null,
  };
}

export async function listStages(
  apiKey: string,
  _jobExternalId: string,
): Promise<NormStage[]> {
  // Match stages are global to the account viewset — listStages ignores the
  // requisition arg, same posture as Lever / Workable / Teamtailor.
  const stages = await walkAll<ManatalStage>(
    apiKey,
    `${BASE_URL}/match-stages/`,
  );
  return stages.map((s) => ({
    id: String(s.id),
    name: str(s.name) ?? `Stage ${s.id}`,
    order: typeof s.rank === 'number' ? s.rank : undefined,
  }));
}

export function listTags(_apiKey: string): Promise<NormTag[]> {
  // No candidate-tag vocabulary endpoint is exposed; nothing to enumerate.
  return Promise.resolve([]);
}
