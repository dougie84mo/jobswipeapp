// Lever Hire API client (Deno).
//
// Docs: https://hire.lever.co/developer/documentation
// Auth: HTTP Basic with `${apiKey}:` — same shape as Greenhouse / Ashby.
// Rate limit: 10 req/s, bursts to 20. 429 with Retry-After honored via
// fetchWithBackoff (same pattern as the other adapters).
//
// Mental model:
// - Lever "posting" ↔ our requisition.
// - Lever "opportunity" ↔ our candidate-in-pipeline (one opportunity per
//   posting per person). Writes target opportunity_id directly, no
//   application lookup needed (unlike Greenhouse / Ashby).
// - Stages are global to the account in Lever, not per-posting. listStages
//   ignores the requisitionExternalId arg the interface still passes.
// - "Tags" on an opportunity are a flat string array. Adding one means
//   reading current tags and PUT-ing the merged list — Lever replaces
//   rather than appends.

const BASE_URL = 'https://api.lever.co/v1';
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
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  return fetch(url, init);
}

interface LeverEnvelope<T> {
  data: T;
  next?: string;
  hasNext?: boolean;
}

async function call<T>(apiKey: string, path: string): Promise<LeverEnvelope<T>> {
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
      `Lever ${res.status} ${res.statusText} for ${path}${body ? `: ${body}` : ''}`,
    );
  }
  return (await res.json()) as LeverEnvelope<T>;
}

// Walks Lever's offset pagination until hasNext goes false or MAX_PAGES.
async function callPaged<T>(apiKey: string, basePath: string): Promise<T[]> {
  const all: T[] = [];
  const sep = basePath.includes('?') ? '&' : '?';
  let offset: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const offsetPart = offset ? `&offset=${encodeURIComponent(offset)}` : '';
    const env = await call<T[]>(
      apiKey,
      `${basePath}${sep}limit=${PER_PAGE}${offsetPart}`,
    );
    all.push(...env.data);
    if (!env.hasNext || !env.next) break;
    offset = env.next;
  }
  return all;
}

async function write<T>(
  apiKey: string,
  method: 'PUT' | 'POST' | 'DELETE',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetchWithBackoff(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const respBody = await res.text().catch(() => '');
    throw new Error(
      `Lever ${res.status} ${res.statusText} for ${method} ${path}${respBody ? `: ${respBody}` : ''}`,
    );
  }
  if (res.status === 204) return undefined as T;
  // Lever's write responses are wrapped in { data: ... } same as reads.
  const json = (await res.json()) as LeverEnvelope<T>;
  return json.data;
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
// Lever response shapes — only the fields we read.
// ============================================================================

interface LeverContact {
  id: string;
  name?: string;
  headline?: string;
  location?: { name: string };
  emails?: string[];
}
interface LeverPosting {
  id: string;
  text: string;
  state?: string;
  categories?: { department?: string; team?: string; location?: string };
}
interface LeverOpportunity {
  id: string;
  contact: LeverContact | string;
  postings?: string[];
  stage?: string;
  tags?: string[];
  archived?: { reason?: string; archivedAt?: number };
  headline?: string;
}
interface LeverStage {
  id: string;
  text: string;
  pipeline?: string;
}
interface LeverTag {
  id?: string;
  text: string;
}
interface LeverUser {
  id: string;
  name?: string;
}

// ============================================================================
// Public methods.
// ============================================================================

export async function testConnection(apiKey: string): Promise<boolean> {
  // /users is the lightest authenticated read.
  await call<LeverUser[]>(apiKey, '/users?limit=1');
  return true;
}

export async function listRequisitions(
  apiKey: string,
): Promise<NormPage<NormRequisition>> {
  // Only published / active postings show up by default in /postings?state=
  // — without a state filter we'd get drafts too. Pull both internal and
  // published so the recruiter sees everything they're actively sourcing.
  const postings = await callPaged<LeverPosting>(
    apiKey,
    '/postings?state=published',
  );
  return {
    items: postings.map((p) => ({
      externalId: p.id,
      title: p.text,
      department: p.categories?.department,
      location: p.categories?.location,
      raw: p,
    })),
    nextCursor: null,
  };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  postingExternalId: string,
): Promise<NormPage<NormCandidate>> {
  // expand=contact inlines the candidate's name/headline/location so we don't
  // need a per-opportunity follow-up the way Greenhouse / Ashby do.
  const opps = await callPaged<LeverOpportunity>(
    apiKey,
    `/opportunities?posting_id=${encodeURIComponent(postingExternalId)}&expand=contact`,
  );
  return {
    items: opps
      // Skip archived opportunities — Lever leaves them on the posting after
      // rejection / hire and they'd otherwise clutter the deck.
      .filter((o) => !o.archived)
      .map((o) => {
        const contact = typeof o.contact === 'string' ? null : o.contact;
        const fullName = contact?.name ?? `Opportunity ${o.id}`;
        return {
          externalId: o.id,
          requisitionExternalId: postingExternalId,
          fullName,
          headline: o.headline ?? contact?.headline ?? undefined,
          location: contact?.location?.name,
          skills: o.tags,
          raw: o,
        } satisfies NormCandidate;
      }),
    nextCursor: null,
  };
}

export async function listStages(
  apiKey: string,
  _postingExternalId: string,
): Promise<NormStage[]> {
  // Lever stages are global to the account, not per-posting. The interface
  // still asks per-req for parity with Greenhouse / Ashby; we ignore the arg.
  const stages = await callPaged<LeverStage>(apiKey, '/stages');
  // Order by pipeline milestone first so the settings UI lists them in a
  // recruiter-meaningful order (lead → applicant → screen → onsite → offer).
  const order = ['lead', 'applicant', 'screen', 'onsite', 'offer'];
  return stages
    .map((s) => ({
      id: s.id,
      name: s.text,
      order:
        s.pipeline === undefined
          ? undefined
          : order.indexOf(s.pipeline) === -1
            ? order.length
            : order.indexOf(s.pipeline),
    }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function listTags(apiKey: string): Promise<NormTag[]> {
  // Lever's /tags returns tag definitions; opportunity.tags is a flat
  // string[]. We surface (id=tag text, name=tag text) — Lever uses the text
  // itself as the apply-tag identifier on PUT /opportunities.
  const tags = await callPaged<LeverTag>(apiKey, '/tags');
  return tags.map((t) => ({ id: t.id ?? t.text, name: t.text }));
}

// ============================================================================
// Writes — Lever's API key is the actor; no On-Behalf-Of needed.
// ============================================================================

export async function changeStage(
  apiKey: string,
  opportunityId: string,
  toStageId: string,
): Promise<void> {
  await write<unknown>(apiKey, 'PUT', `/opportunities/${opportunityId}`, {
    stage: toStageId,
  });
}

export async function archiveOpportunity(
  apiKey: string,
  opportunityId: string,
  reasonId: string | undefined,
): Promise<void> {
  if (!reasonId) {
    // Lever requires an archive reason. Surface a clear message rather than
    // silently archiving with whatever default Lever might pick.
    throw new Error(
      'Lever archive requires a reason_id. Configure one on the reject action descriptor.',
    );
  }
  await write<unknown>(apiKey, 'PUT', `/opportunities/${opportunityId}`, {
    archived: { reason: reasonId },
  });
}

export async function addOpportunityNote(
  apiKey: string,
  opportunityId: string,
  note: string,
): Promise<void> {
  await write<unknown>(
    apiKey,
    'POST',
    `/opportunities/${opportunityId}/notes`,
    { value: note },
  );
}

export async function addOpportunityTag(
  apiKey: string,
  opportunityId: string,
  tagId: string,
): Promise<void> {
  // PUT /opportunities/:id with { tags } REPLACES the array. Fetch current
  // tags first and append, so we don't silently strip the recruiter's
  // previous tags.
  const env = await call<LeverOpportunity>(
    apiKey,
    `/opportunities/${opportunityId}`,
  );
  const current = env.data.tags ?? [];
  if (current.includes(tagId)) return;
  await write<unknown>(apiKey, 'PUT', `/opportunities/${opportunityId}`, {
    tags: [...current, tagId],
  });
}
