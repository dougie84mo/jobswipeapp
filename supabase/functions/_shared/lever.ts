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

import {
  authHeaderBasic,
  callGet,
  callWrite,
  MAX_PAGES,
  PER_PAGE,
} from './http.ts';

const BASE_URL = 'https://api.lever.co/v1';

interface LeverEnvelope<T> {
  data: T;
  next?: string;
  hasNext?: boolean;
}

async function call<T>(
  apiKey: string,
  path: string,
): Promise<LeverEnvelope<T>> {
  return callGet<LeverEnvelope<T>>(
    `${BASE_URL}${path}`,
    { Authorization: authHeaderBasic(apiKey), Accept: 'application/json' },
    { provider: 'Lever', route: path },
  );
}

// One page of Lever's offset pagination. The opaque cursor is the offset
// token; '' (or undefined-coerced) means the first page (no offset).
// nextCursor is Lever's `next` offset when hasNext, else null.
async function callOnePage<T>(
  apiKey: string,
  basePath: string,
  cursor: string | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const sep = basePath.includes('?') ? '&' : '?';
  const offsetPart = cursor ? `&offset=${encodeURIComponent(cursor)}` : '';
  const env = await call<T[]>(
    apiKey,
    `${basePath}${sep}limit=${PER_PAGE}${offsetPart}`,
  );
  return {
    items: env.data,
    nextCursor: env.hasNext && env.next ? env.next : null,
  };
}

// Auto-walks all pages (up to MAX_PAGES) on top of callOnePage.
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
  method: 'PUT' | 'POST' | 'DELETE',
  path: string,
  body: unknown,
): Promise<T> {
  // Lever's write responses are wrapped in { data: ... } same as reads; a 204
  // yields undefined from callWrite, so unwrap defensively.
  const env = await callWrite<LeverEnvelope<T> | undefined>(
    `${BASE_URL}${path}`,
    method,
    {
      Authorization: authHeaderBasic(apiKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    { provider: 'Lever', route: path },
  );
  return env?.data as T;
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
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // Only published / active postings show up by default in /postings?state=
  // — without a state filter we'd get drafts too. No cursor → walk all
  // (nextCursor null); a cursor → one page with the real next offset.
  const map = (p: LeverPosting): NormRequisition => ({
    externalId: p.id,
    title: p.text,
    department: p.categories?.department,
    location: p.categories?.location,
    raw: p,
  });
  if (cursor === undefined) {
    const postings = await callPaged<LeverPosting>(
      apiKey,
      '/postings?state=published',
    );
    return { items: postings.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<LeverPosting>(
    apiKey,
    '/postings?state=published',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  apiKey: string,
  postingExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // expand=contact inlines the candidate's name/headline/location so we don't
  // need a per-opportunity follow-up the way Greenhouse / Ashby do.
  const path = `/opportunities?posting_id=${
    encodeURIComponent(postingExternalId)
  }&expand=contact`;
  let opps: LeverOpportunity[];
  let nextCursor: string | null = null;
  if (cursor === undefined) {
    opps = await callPaged<LeverOpportunity>(apiKey, path);
  } else {
    const page = await callOnePage<LeverOpportunity>(apiKey, path, cursor);
    opps = page.items;
    nextCursor = page.nextCursor;
  }
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
    nextCursor,
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
      order: s.pipeline === undefined
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
