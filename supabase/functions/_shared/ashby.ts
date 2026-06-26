// Ashby API client (Deno).
//
// Docs: https://developers.ashbyhq.com
// Auth: HTTP Basic with `${apiKey}:` (API key as username, blank password).
// Quirk: every endpoint is POST, even reads. Filters and IDs go in the JSON
// body rather than the URL.
// Ashby has no per-action On-Behalf-Of equivalent — the API key itself is
// the actor — so writes don't need integrations.on_behalf_of_user_id.
//
// Reads (testConnection / listRequisitions / listCandidatesForRequisition /
// listStages / listTags) and writes (changeStage / createNote / addTag) are
// implemented. Reject is deferred: Ashby archives applications, but the
// archive endpoint isn't in the LLM-formatted endpoint index we have to
// verify against, so we skip rather than hit a guessed URL.
//
// Rate limit: 429 with Retry-After. fetchWithBackoff sleeps the advised
// interval and retries up to MAX_RETRY_ATTEMPTS. Paginated reads use
// Ashby's cursor model (moreDataAvailable + nextCursor in the envelope) up
// to MAX_PAGES iterations; the proxy returns a flat array.

import { authHeaderBasic, callWrite, MAX_PAGES, pooledMap } from './http.ts';

const BASE_URL = 'https://api.ashbyhq.com';

interface AshbyEnvelope<T> {
  success: boolean;
  results?: T;
  errors?: string[];
  moreDataAvailable?: boolean;
  nextCursor?: string;
}

// Every Ashby endpoint is POST, even reads. callWrite handles transport +
// non-2xx; we additionally enforce the envelope's success flag.
async function callEnvelope<T>(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<AshbyEnvelope<T>> {
  const json = await callWrite<AshbyEnvelope<T>>(
    `${BASE_URL}${path}`,
    'POST',
    {
      Authorization: authHeaderBasic(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body ?? {},
    { provider: 'Ashby', route: path },
  );
  if (json.success === false) {
    throw new Error(
      `Ashby ${path} returned success:false${
        json.errors?.length ? `: ${json.errors.join('; ')}` : ''
      }`,
    );
  }
  return json;
}

async function call<T>(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<T> {
  const env = await callEnvelope<T>(apiKey, path, body);
  return env.results as T;
}

// One page of Ashby's cursor pagination. The opaque cursor maps directly to
// Ashby's body `cursor`; '' (or undefined-coerced) means the first page.
// nextCursor is Ashby's nextCursor when moreDataAvailable, else null.
async function callOnePage<T>(
  apiKey: string,
  path: string,
  baseBody: Record<string, unknown>,
  cursor: string | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const body = cursor ? { ...baseBody, cursor } : baseBody;
  const env = await callEnvelope<T[]>(apiKey, path, body);
  return {
    items: env.results ?? [],
    nextCursor: env.moreDataAvailable && env.nextCursor ? env.nextCursor : null,
  };
}

// Auto-walks all pages (up to MAX_PAGES) on top of callOnePage.
async function callPaged<T>(
  apiKey: string,
  path: string,
  baseBody: Record<string, unknown>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    // Annotated to break TS 6's circular-inference check (TS7022) on a generic
    // helper called inside a generic function.
    const { items, nextCursor }: { items: T[]; nextCursor: string | null } =
      await callOnePage<T>(
        apiKey,
        path,
        baseBody,
        cursor,
      );
    all.push(...items);
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
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
// Ashby response shapes — only the fields we read.
// ============================================================================

interface AshbyJob {
  id: string;
  title: string;
  status: string;
  departmentId?: string;
  department?: { id: string; name: string };
  locationId?: string;
  location?: { id: string; name: string };
}
interface AshbyApplication {
  id: string;
  candidateId: string;
  jobId: string;
  currentInterviewStage?: { id: string; title: string };
  status?: string;
}
interface AshbyCandidate {
  id: string;
  name?: string;
  primaryEmailAddress?: { value: string } | string;
  position?: string;
  company?: string;
  primaryLocation?: { locationSummary?: string; name?: string };
  resumeFileHandle?: { handle: string };
  profileUrl?: string;
  applicationIds?: string[];
  tags?: { id: string; title: string }[];
}
interface AshbyInterviewPlan {
  id: string;
  jobId: string;
  interviewStages?: AshbyInterviewStage[];
}
interface AshbyInterviewStage {
  id: string;
  title: string;
  orderInInterviewPlan?: number;
  type?: string;
}
interface AshbyTag {
  id: string;
  title: string;
}
interface AshbyApiKeyInfo {
  organizationName?: string;
  scopes?: string[];
}

// ============================================================================
// Public methods.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  await call<AshbyApiKeyInfo>(apiKey, '/apiKey.info', {});
  return true;
}

export async function listRequisitions(
  apiKey: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // Ashby's job statuses: "Open" / "Closed" / "Archived" / "Draft". The
  // filter is a list; we only care about Open for sourcing. No cursor → walk
  // all pages (nextCursor null); a cursor → one page + its real next cursor.
  const map = (j: AshbyJob): NormRequisition => ({
    externalId: j.id,
    title: j.title,
    department: j.department?.name,
    location: j.location?.name,
    raw: j,
  });
  const baseBody = { status: ['Open'] };
  if (cursor === undefined) {
    const jobs = await callPaged<AshbyJob>(apiKey, '/job.list', baseBody);
    return { items: jobs.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<AshbyJob>(
    apiKey,
    '/job.list',
    baseBody,
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // Status filter omitted — Ashby treats applications without explicit
  // archive/hire as active. We render every candidate the recruiter still
  // has in the pipeline. Pagination follows the application page; no cursor →
  // walk all (nextCursor null), a cursor → one page + its next cursor.
  const baseBody = { jobId: jobExternalId };
  let apps: AshbyApplication[];
  let nextCursor: string | null = null;
  if (cursor === undefined) {
    apps = await callPaged<AshbyApplication>(
      apiKey,
      '/application.list',
      baseBody,
    );
  } else {
    const page = await callOnePage<AshbyApplication>(
      apiKey,
      '/application.list',
      baseBody,
      cursor,
    );
    apps = page.items;
    nextCursor = page.nextCursor;
  }
  const candidates = await pooledMap(
    apps,
    async (app) => {
      const c = await call<AshbyCandidate>(apiKey, '/candidate.info', {
        id: app.candidateId,
      });
      const fullName = c.name ?? `Candidate ${c.id}`;
      const headlineParts = [c.position, c.company].filter(Boolean);
      return {
        externalId: c.id,
        requisitionExternalId: jobExternalId,
        fullName,
        headline: headlineParts.join(' • ') || undefined,
        location: c.primaryLocation?.locationSummary ?? c.primaryLocation?.name,
        resumeUrl: undefined, // resumeFileHandle is opaque; needs file.info to resolve
        photoUrl: undefined, // Ashby doesn't expose candidate photos
        skills: c.tags?.map((t) => t.title),
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
  // Ashby couples stages to an interview plan, not the job directly.
  // jobInterviewPlan.info(jobId) returns the plan, which embeds the stages
  // — saves a second hop to interviewStage.list.
  const plan = await call<AshbyInterviewPlan>(
    apiKey,
    '/jobInterviewPlan.info',
    {
      jobId: jobExternalId,
    },
  );
  return (plan.interviewStages ?? []).map((s) => ({
    id: s.id,
    name: s.title,
    order: s.orderInInterviewPlan,
  }));
}

export async function listTags(apiKey: string): Promise<NormTag[]> {
  const tags = await callPaged<AshbyTag>(apiKey, '/candidateTag.list', {});
  return tags.map((t) => ({ id: t.id, name: t.title }));
}

// ============================================================================
// Writes.
// ============================================================================

async function findApplicationId(
  apiKey: string,
  candidateId: string,
  jobId: string,
): Promise<string> {
  const apps = await call<AshbyApplication[]>(apiKey, '/application.list', {
    jobId,
    candidateId,
  });
  const found = apps.find(
    (a) => a.candidateId === candidateId && a.jobId === jobId,
  );
  if (!found) {
    throw new Error(
      `Ashby: no application for candidate ${candidateId} on job ${jobId}`,
    );
  }
  return found.id;
}

export async function changeStage(
  apiKey: string,
  candidateId: string,
  jobId: string,
  toStageId: string,
): Promise<void> {
  const applicationId = await findApplicationId(apiKey, candidateId, jobId);
  await call<unknown>(apiKey, '/application.changeStage', {
    applicationId,
    interviewStageId: toStageId,
  });
}

export async function createCandidateNote(
  apiKey: string,
  candidateId: string,
  note: string,
): Promise<void> {
  await call<unknown>(apiKey, '/candidate.createNote', {
    candidateId,
    note,
  });
}

export async function addCandidateTag(
  apiKey: string,
  candidateId: string,
  tagId: string,
): Promise<void> {
  await call<unknown>(apiKey, '/candidate.addTag', {
    candidateId,
    tagId,
  });
}
