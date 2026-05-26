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

const BASE_URL = 'https://api.ashbyhq.com';
const MAX_PAGES = 10;
const MAX_RETRY_ATTEMPTS = 3;

function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
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

interface AshbyEnvelope<T> {
  success: boolean;
  results?: T;
  errors?: string[];
  moreDataAvailable?: boolean;
  nextCursor?: string;
}

async function callEnvelope<T>(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<AshbyEnvelope<T>> {
  const res = await fetchWithBackoff(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(
      `Ashby ${res.status} ${res.statusText} for ${path}${errBody ? `: ${errBody}` : ''}`,
    );
  }
  const json = (await res.json()) as AshbyEnvelope<T>;
  if (json.success === false) {
    throw new Error(
      `Ashby ${path} returned success:false${json.errors?.length ? `: ${json.errors.join('; ')}` : ''}`,
    );
  }
  return json;
}

async function call<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const env = await callEnvelope<T>(apiKey, path, body);
  return env.results as T;
}

// Walks Ashby's cursor pagination until moreDataAvailable goes false or
// MAX_PAGES is hit. Concatenates the results arrays.
async function callPaged<T>(
  apiKey: string,
  path: string,
  baseBody: Record<string, unknown>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const body = cursor ? { ...baseBody, cursor } : baseBody;
    const env = await callEnvelope<T[]>(apiKey, path, body);
    const items = env.results ?? [];
    all.push(...items);
    if (!env.moreDataAvailable || !env.nextCursor) break;
    cursor = env.nextCursor;
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
): Promise<NormPage<NormRequisition>> {
  // Ashby's job statuses: "Open" / "Closed" / "Archived" / "Draft". The
  // filter is a list; we only care about Open for sourcing. Walks the
  // cursor up to MAX_PAGES so accounts with hundreds of open reqs work.
  const jobs = await callPaged<AshbyJob>(apiKey, '/job.list', {
    status: ['Open'],
  });
  return {
    items: jobs.map((j) => ({
      externalId: j.id,
      title: j.title,
      department: j.department?.name,
      location: j.location?.name,
      raw: j,
    })),
    nextCursor: null,
  };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  jobExternalId: string,
): Promise<NormPage<NormCandidate>> {
  const apps = await callPaged<AshbyApplication>(apiKey, '/application.list', {
    jobId: jobExternalId,
    // Status filter omitted — Ashby treats applications without explicit
    // archive/hire as active. We render every candidate the recruiter still
    // has in the pipeline.
  });
  const candidates = await Promise.all(
    apps.map(async (app) => {
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
        photoUrl: undefined,  // Ashby doesn't expose candidate photos
        skills: c.tags?.map((t) => t.title),
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
  // Ashby couples stages to an interview plan, not the job directly.
  // jobInterviewPlan.info(jobId) returns the plan, which embeds the stages
  // — saves a second hop to interviewStage.list.
  const plan = await call<AshbyInterviewPlan>(apiKey, '/jobInterviewPlan.info', {
    jobId: jobExternalId,
  });
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
