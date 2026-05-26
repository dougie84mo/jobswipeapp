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

const MAX_PAGES = 10;
const PER_PAGE = 100;
const MAX_RETRY_ATTEMPTS = 3;

function baseUrl(subdomain: string): string {
  return `https://${subdomain}.workable.com/spi/v3`;
}

function authHeader(token: string): string {
  return `Bearer ${token}`;
}

async function fetchWithBackoff(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get('Retry-After')) || 1;
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  return fetch(url, init);
}

async function call<T>(
  subdomain: string,
  token: string,
  path: string,
): Promise<T> {
  const res = await fetchWithBackoff(`${baseUrl(subdomain)}${path}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader(token),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Workable ${res.status} ${res.statusText} for ${path}${body ? `: ${body}` : ''}`,
    );
  }
  return (await res.json()) as T;
}

// Workable pagination uses `Link` headers with rel="next" cursors plus
// `paging.next` in the JSON body. Both forms work; we read body.paging.next
// since it's simpler than parsing Link.
async function callPaged<T>(
  subdomain: string,
  token: string,
  basePath: string,
  resultsKey: string,
): Promise<T[]> {
  const all: T[] = [];
  const sep = basePath.includes('?') ? '&' : '?';
  let url: string | null = `${basePath}${sep}limit=${PER_PAGE}`;
  for (let i = 0; i < MAX_PAGES && url; i++) {
    // First iteration url is a relative path; subsequent iterations the API
    // returns absolute paging.next URLs, so we use those raw.
    const fullPath = url.startsWith('http') ? null : url;
    const res = fullPath
      ? await call<Record<string, unknown>>(subdomain, token, fullPath)
      : await callAbsolute<Record<string, unknown>>(token, url);
    const batch = (res[resultsKey] as T[]) ?? [];
    all.push(...batch);
    const paging = res.paging as { next?: string } | undefined;
    url = paging?.next ?? null;
  }
  return all;
}

async function callAbsolute<T>(token: string, url: string): Promise<T> {
  const res = await fetchWithBackoff(url, {
    method: 'GET',
    headers: {
      Authorization: authHeader(token),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Workable ${res.status} ${res.statusText} for ${url}${body ? `: ${body}` : ''}`,
    );
  }
  return (await res.json()) as T;
}

async function write<T>(
  subdomain: string,
  token: string,
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetchWithBackoff(`${baseUrl(subdomain)}${path}`, {
    method,
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const respBody = await res.text().catch(() => '');
    throw new Error(
      `Workable ${res.status} ${res.statusText} for ${method} ${path}${respBody ? `: ${respBody}` : ''}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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

export async function testConnection(subdomain: string, token: string): Promise<boolean> {
  // /accounts is the lightest authenticated endpoint — confirms both the
  // token and the subdomain resolve.
  await call<unknown>(subdomain, token, '/accounts');
  return true;
}

export async function listRequisitions(
  subdomain: string,
  token: string,
): Promise<NormPage<NormRequisition>> {
  // state=published surfaces active job postings. Workable's full state
  // set includes 'draft', 'archived', 'closed' which we don't source from.
  const jobs = await callPaged<WorkableJob>(
    subdomain,
    token,
    '/jobs?state=published',
    'jobs',
  );
  return {
    items: jobs.map((j) => ({
      // Workable APIs use the job shortcode as the addressable id — same
      // value we'd pass to /jobs/:shortcode/candidates.
      externalId: j.shortcode,
      title: j.title,
      department: j.department,
      location: [j.location?.city, j.location?.country].filter(Boolean).join(', '),
      raw: j,
    })),
    nextCursor: null,
  };
}

export async function listCandidatesForRequisition(
  subdomain: string,
  token: string,
  jobShortcode: string,
): Promise<NormPage<NormCandidate>> {
  // /jobs/:shortcode/candidates returns candidates for a specific job
  // already filtered to that posting — no follow-up GET needed.
  const candidates = await callPaged<WorkableCandidate>(
    subdomain,
    token,
    `/jobs/${encodeURIComponent(jobShortcode)}/candidates`,
    'candidates',
  );
  return {
    items: candidates.map((c) => ({
      externalId: c.id,
      requisitionExternalId: jobShortcode,
      fullName:
        c.name ??
        [c.firstname, c.lastname].filter(Boolean).join(' ').trim() ??
        `Candidate ${c.id}`,
      headline: c.headline,
      location: c.address,
      resumeUrl: c.resume_url,
      skills: c.tags,
      raw: c,
    })),
    nextCursor: null,
  };
}

export async function listStages(
  subdomain: string,
  token: string,
  _jobShortcode: string,
): Promise<NormStage[]> {
  // Workable stages are global to the account, not per-job. Same posture
  // as Lever — listStages ignores the requisitionExternalId arg.
  const res = await call<{ stages: WorkableStage[] }>(subdomain, token, '/stages');
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
  await write<unknown>(subdomain, token, 'POST', `/candidates/${candidateId}/move`, {
    target_stage: toStageSlug,
  });
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
  await write<unknown>(subdomain, token, 'PUT', `/candidates/${candidateId}/tags`, {
    tags: [...existing, tag],
  });
}
