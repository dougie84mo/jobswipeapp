// Workable API client (Deno).
//
// Docs: https://workable.readme.io/reference
// Auth: Bearer access token (Settings → Integrations → API Access Tokens).
// Base URL: https://{subdomain}.workable.com/spi/v3 — the API is at the
// account subdomain, NOT api.workable.com, and the path is /spi/v3 not
// /api/v3. Hitting the wrong base returns 404 silently.
//
// The recruiter provides two things at connect time: the access token and
// their account subdomain. The token goes into Vault; the subdomain goes
// into integrations.extras.subdomain. The proxy reads both before calling
// in.
//
// Rate limit: 5 requests/second per subdomain. 429 with Retry-After
// honored by fetchWithBackoff.

import {
  authHeaderBearer,
  callGet,
  callWrite,
  MAX_PAGES,
  PER_PAGE,
} from './http.ts';

function baseUrl(subdomain: string): string {
  return `https://${subdomain}.workable.com/spi/v3`;
}

async function call<T>(
  subdomain: string,
  token: string,
  path: string,
): Promise<T> {
  return callGet<T>(
    `${baseUrl(subdomain)}${path}`,
    { Authorization: authHeaderBearer(token), Accept: 'application/json' },
    { provider: 'Workable', route: path },
  );
}

// One page of Workable pagination. Workable uses `Link` rel="next" plus
// `paging.next` (an absolute URL) in the body; we read paging.next. The opaque
// cursor IS that next URL; '' (or undefined-coerced) means the first relative
// page. nextCursor is the absolute next URL, or null when finished.
async function callOnePage<T>(
  subdomain: string,
  token: string,
  basePath: string,
  resultsKey: string,
  cursor: string | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const sep = basePath.includes('?') ? '&' : '?';
  const url = cursor ? cursor : `${basePath}${sep}limit=${PER_PAGE}`;
  // The first page is a relative path; subsequent cursors are absolute URLs.
  const res = url.startsWith('http')
    ? await callAbsolute<Record<string, unknown>>(token, url)
    : await call<Record<string, unknown>>(subdomain, token, url);
  const batch = (res[resultsKey] as T[]) ?? [];
  const paging = res.paging as { next?: string } | undefined;
  return { items: batch, nextCursor: paging?.next ?? null };
}

// Auto-walks all pages (up to MAX_PAGES) on top of callOnePage.
async function callPaged<T>(
  subdomain: string,
  token: string,
  basePath: string,
  resultsKey: string,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    // Annotated to break TS 6's circular-inference check (TS7022) on a generic
    // helper called inside a generic function.
    const { items, nextCursor }: { items: T[]; nextCursor: string | null } =
      await callOnePage<T>(
        subdomain,
        token,
        basePath,
        resultsKey,
        cursor,
      );
    all.push(...items);
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
}

async function callAbsolute<T>(token: string, url: string): Promise<T> {
  return callGet<T>(
    url,
    { Authorization: authHeaderBearer(token), Accept: 'application/json' },
    { provider: 'Workable', route: url },
  );
}

async function write<T>(
  subdomain: string,
  token: string,
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  return callWrite<T>(
    `${baseUrl(subdomain)}${path}`,
    method,
    {
      Authorization: authHeaderBearer(token),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    { provider: 'Workable', route: path },
  );
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
// Workable response shapes — only the fields we read.
// ============================================================================

interface WorkableJob {
  id: string;
  shortcode: string;
  title: string;
  state: string;
  department?: string;
  location?: { city?: string; country?: string };
}
interface WorkableCandidate {
  id: string;
  name: string;
  firstname?: string;
  lastname?: string;
  headline?: string;
  job?: { shortcode: string; title: string };
  stage?: string;
  address?: string;
  tags?: string[];
  resume_url?: string;
}
interface WorkableStage {
  slug: string;
  name: string;
  kind?: string;
  position?: number;
}

// ============================================================================
// Public methods.
// ============================================================================

export async function testConnection(
  subdomain: string,
  token: string,
): Promise<boolean> {
  // /accounts is the lightest authenticated endpoint — confirms both the
  // token and the subdomain resolve.
  await call<unknown>(subdomain, token, '/accounts');
  return true;
}

export async function listRequisitions(
  subdomain: string,
  token: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // state=published surfaces active job postings. Workable's full state
  // set includes 'draft', 'archived', 'closed' which we don't source from.
  // No cursor → walk all (nextCursor null); a cursor → one page + next URL.
  const map = (j: WorkableJob): NormRequisition => ({
    // Workable APIs use the job shortcode as the addressable id — same
    // value we'd pass to /jobs/:shortcode/candidates.
    externalId: j.shortcode,
    title: j.title,
    department: j.department,
    location: [j.location?.city, j.location?.country].filter(Boolean).join(
      ', ',
    ),
    raw: j,
  });
  if (cursor === undefined) {
    const jobs = await callPaged<WorkableJob>(
      subdomain,
      token,
      '/jobs?state=published',
      'jobs',
    );
    return { items: jobs.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<WorkableJob>(
    subdomain,
    token,
    '/jobs?state=published',
    'jobs',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  subdomain: string,
  token: string,
  jobShortcode: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // /jobs/:shortcode/candidates returns candidates for a specific job
  // already filtered to that posting — no follow-up GET needed. No cursor →
  // walk all (nextCursor null); a cursor → one page + next URL.
  const path = `/jobs/${encodeURIComponent(jobShortcode)}/candidates`;
  const map = (c: WorkableCandidate): NormCandidate => ({
    externalId: c.id,
    requisitionExternalId: jobShortcode,
    fullName: c.name ??
      [c.firstname, c.lastname].filter(Boolean).join(' ').trim() ??
      `Candidate ${c.id}`,
    headline: c.headline,
    location: c.address,
    resumeUrl: c.resume_url,
    skills: c.tags,
    raw: c,
  });
  if (cursor === undefined) {
    const candidates = await callPaged<WorkableCandidate>(
      subdomain,
      token,
      path,
      'candidates',
    );
    return { items: candidates.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<WorkableCandidate>(
    subdomain,
    token,
    path,
    'candidates',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listStages(
  subdomain: string,
  token: string,
  _jobShortcode: string,
): Promise<NormStage[]> {
  // Workable stages are global to the account, not per-job. Same posture
  // as Lever — listStages ignores the requisitionExternalId arg.
  const res = await call<{ stages: WorkableStage[] }>(
    subdomain,
    token,
    '/stages',
  );
  return res.stages.map((s) => ({
    id: s.slug,
    name: s.name,
    order: s.position,
  }));
}

export async function listTags(
  subdomain: string,
  token: string,
): Promise<NormTag[]> {
  // Workable's tag list endpoint returns a flat array of tag strings under
  // `tags`. We surface (id=tag, name=tag) since Workable identifies tags by
  // their text in subsequent writes.
  const res = await call<{ tags: string[] }>(subdomain, token, '/tags');
  return res.tags.map((t) => ({ id: t, name: t }));
}

// ============================================================================
// Writes.
// ============================================================================

export async function moveStage(
  subdomain: string,
  token: string,
  candidateId: string,
  toStageSlug: string,
): Promise<void> {
  await write<unknown>(
    subdomain,
    token,
    'POST',
    `/candidates/${candidateId}/move`,
    {
      target_stage: toStageSlug,
    },
  );
}

export async function disqualifyCandidate(
  subdomain: string,
  token: string,
  candidateId: string,
  reasonId: string | undefined,
): Promise<void> {
  // Workable disqualify accepts an optional disqualification_reason_id and
  // optional reason text. We forward whatever the action descriptor carries.
  const body: Record<string, unknown> = {};
  if (reasonId) body.disqualification_reason_id = reasonId;
  await write<unknown>(
    subdomain,
    token,
    'POST',
    `/candidates/${candidateId}/disqualify`,
    body,
  );
}

export async function addCandidateComment(
  subdomain: string,
  token: string,
  candidateId: string,
  comment: string,
): Promise<void> {
  await write<unknown>(
    subdomain,
    token,
    'POST',
    `/candidates/${candidateId}/comments`,
    { comment: { body: comment } },
  );
}

export async function setCandidateTags(
  subdomain: string,
  token: string,
  candidateId: string,
  tag: string,
): Promise<void> {
  // Workable's PUT /candidates/:id/tags REPLACES the tag set. To add a
  // single tag without losing the existing ones, fetch current tags first
  // and union before writing back.
  const current = await call<WorkableCandidate>(
    subdomain,
    token,
    `/candidates/${candidateId}`,
  );
  const existing = current.tags ?? [];
  if (existing.includes(tag)) return;
  await write<unknown>(
    subdomain,
    token,
    'PUT',
    `/candidates/${candidateId}/tags`,
    {
      tags: [...existing, tag],
    },
  );
}
