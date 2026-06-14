// Recruitee JSON API client (Deno).
//
// Docs: https://docs.recruitee.com (reference), https://apidocs.recruitee.com
// Auth: Bearer personal API token (Settings → Apps and plugins →
// Personal API tokens).
// Base URL: https://api.recruitee.com/c/{company_id} — company_id is the
// numeric account id shown next to the token in the dashboard.
//
// Connect-time inputs (both required, recorded by the proxy):
//   credentials → Vault (the token)
//   integrations.extras.company_id (string)
//
// Rate limits: 5 req/min on trial, 100 req/min otherwise. 429 with
// Retry-After honored by fetchWithBackoff.
//
// Capability set we ship:
//   advance_stage / reject / apply_tag / add_note  ✓
//   send_template / send_message                    ✗ (no equivalent
//                                                      Recruitee endpoint
//                                                      that fits the
//                                                      action descriptor)

import {
  authHeaderBearer,
  callGet,
  callWrite,
  MAX_PAGES,
  PER_PAGE,
} from './http.ts';

function baseUrl(companyId: string): string {
  return `https://api.recruitee.com/c/${companyId}`;
}

async function call<T>(
  companyId: string,
  token: string,
  path: string,
): Promise<T> {
  return callGet<T>(
    `${baseUrl(companyId)}${path}`,
    { Authorization: authHeaderBearer(token), Accept: 'application/json' },
    { provider: 'Recruitee', route: path },
  );
}

// One page of Recruitee's page-based pagination (?page=N&limit=100). Responses
// carry no "next page" hint, so a full page implies more. The opaque cursor is
// the page number; '' (or undefined-coerced) means page 1. nextCursor is the
// next page number, or null when a short page ends the walk.
async function callOnePage<T>(
  companyId: string,
  token: string,
  basePath: string,
  resultsKey: string,
  cursor: string | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  const sep = basePath.includes('?') ? '&' : '?';
  const page = cursor ? Number(cursor) : 1;
  const res = await call<Record<string, unknown>>(
    companyId,
    token,
    `${basePath}${sep}limit=${PER_PAGE}&page=${page}`,
  );
  const batch = (res[resultsKey] as T[]) ?? [];
  return {
    items: batch,
    nextCursor: batch.length < PER_PAGE ? null : String(page + 1),
  };
}

// Auto-walks all pages (up to MAX_PAGES) on top of callOnePage.
async function callPaged<T>(
  companyId: string,
  token: string,
  basePath: string,
  resultsKey: string,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const { items, nextCursor } = await callOnePage<T>(
      companyId,
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

async function write<T>(
  companyId: string,
  token: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
): Promise<T> {
  return callWrite<T>(
    `${baseUrl(companyId)}${path}`,
    method,
    {
      Authorization: authHeaderBearer(token),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
    { provider: 'Recruitee', route: path },
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
// Recruitee response shapes — only the fields we read.
// ============================================================================

interface RecruiteeOffer {
  id: number;
  title: string;
  slug: string;
  status: string;
  department?: { name: string };
  location?: { city?: string; country_code?: string };
}
interface RecruiteeCandidate {
  id: number;
  name: string;
  emails?: string[];
  positive_ratings?: number;
  source?: string;
  photo_thumb_url?: string;
  cv_url?: string;
  fields?: { kind: string; values?: { text?: string }[] }[];
  placements?: { offer_id: number; stage_id?: number; status?: string }[];
  tags?: string[];
}
interface RecruiteeStage {
  id: number;
  name: string;
  category?: string;
  position?: number;
}
interface RecruiteeTag {
  id: number;
  name: string;
}

// ============================================================================
// Public methods.
// ============================================================================

export async function testConnection(
  companyId: string,
  token: string,
): Promise<boolean> {
  // /current_user is the lightest authenticated read and confirms the token
  // belongs to a user in the given company.
  await call<unknown>(companyId, token, '/current_user');
  return true;
}

export async function listRequisitions(
  companyId: string,
  token: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // status=published surfaces active job postings. Other Recruitee statuses
  // (draft, closed, archived, internal) aren't surfaced. No cursor → walk all
  // (nextCursor null); a cursor → one page + its next page cursor.
  const map = (o: RecruiteeOffer): NormRequisition => ({
    externalId: String(o.id),
    title: o.title,
    department: o.department?.name,
    location: [o.location?.city, o.location?.country_code].filter(Boolean).join(
      ', ',
    ),
    raw: o,
  });
  if (cursor === undefined) {
    const offers = await callPaged<RecruiteeOffer>(
      companyId,
      token,
      '/offers?status=published',
      'offers',
    );
    return { items: offers.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<RecruiteeOffer>(
    companyId,
    token,
    '/offers?status=published',
    'offers',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  companyId: string,
  token: string,
  offerExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  // /offers/:id/candidates returns candidates already filtered to that
  // offer's placements. No follow-up GETs needed. No cursor → walk all
  // (nextCursor null); a cursor → one page + its next page cursor.
  const path = `/offers/${encodeURIComponent(offerExternalId)}/candidates`;
  const map = (c: RecruiteeCandidate): NormCandidate => ({
    externalId: String(c.id),
    requisitionExternalId: offerExternalId,
    fullName: c.name ?? `Candidate ${c.id}`,
    headline: c.fields?.find((f) => f.kind === 'position')?.values?.[0]?.text,
    location: c.fields?.find((f) => f.kind === 'location')?.values?.[0]?.text,
    resumeUrl: c.cv_url,
    photoUrl: c.photo_thumb_url,
    skills: c.tags,
    raw: c,
  });
  if (cursor === undefined) {
    const candidates = await callPaged<RecruiteeCandidate>(
      companyId,
      token,
      path,
      'candidates',
    );
    return { items: candidates.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callOnePage<RecruiteeCandidate>(
    companyId,
    token,
    path,
    'candidates',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listStages(
  companyId: string,
  token: string,
  _offerExternalId: string,
): Promise<NormStage[]> {
  // Recruitee stages live on a pipeline template. Pipeline stages are
  // global to the company in practice — listStages ignores the
  // requisitionExternalId arg, same posture as Lever / Workable.
  const res = await call<{ stages: RecruiteeStage[] }>(
    companyId,
    token,
    '/pipeline_templates/default_stages',
  );
  return (res.stages ?? []).map((s) => ({
    id: String(s.id),
    name: s.name,
    order: s.position,
  }));
}

export async function listTags(
  companyId: string,
  token: string,
): Promise<NormTag[]> {
  const res = await call<{ tags: RecruiteeTag[] }>(companyId, token, '/tags');
  return (res.tags ?? []).map((t) => ({ id: String(t.id), name: t.name }));
}

// ============================================================================
// Writes.
// ============================================================================

export async function moveStage(
  companyId: string,
  token: string,
  candidateId: string,
  toStageId: string,
  offerExternalId: string,
): Promise<void> {
  // Stage move targets a candidate's placement on a specific offer. Find
  // the placement id from the candidate's placements array — Recruitee
  // returns one placement per offer.
  const res = await call<{ candidate: RecruiteeCandidate }>(
    companyId,
    token,
    `/candidates/${candidateId}`,
  );
  const placement = res.candidate.placements?.find(
    (p) => String(p.offer_id) === offerExternalId,
  );
  if (!placement) {
    throw new Error(
      `Recruitee: candidate ${candidateId} has no placement on offer ${offerExternalId}`,
    );
  }
  await write<unknown>(
    companyId,
    token,
    'PATCH',
    `/candidates/${candidateId}/placements/${
      (placement as { id?: number }).id
    }`,
    { stage_id: Number(toStageId) },
  );
}

export async function disqualifyCandidate(
  companyId: string,
  token: string,
  candidateId: string,
  offerExternalId: string,
  reasonId: string | undefined,
): Promise<void> {
  const res = await call<{ candidate: RecruiteeCandidate }>(
    companyId,
    token,
    `/candidates/${candidateId}`,
  );
  const placement = res.candidate.placements?.find(
    (p) => String(p.offer_id) === offerExternalId,
  );
  if (!placement) {
    throw new Error(
      `Recruitee: candidate ${candidateId} has no placement on offer ${offerExternalId}`,
    );
  }
  const body: Record<string, unknown> = { status: 'disqualified' };
  if (reasonId) body.disqualify_reason_id = Number(reasonId);
  await write<unknown>(
    companyId,
    token,
    'PATCH',
    `/candidates/${candidateId}/placements/${
      (placement as { id?: number }).id
    }`,
    body,
  );
}

export async function addCandidateNote(
  companyId: string,
  token: string,
  candidateId: string,
  noteBody: string,
): Promise<void> {
  await write<unknown>(
    companyId,
    token,
    'POST',
    `/candidates/${candidateId}/notes`,
    { note: { body: noteBody } },
  );
}

export async function addCandidateTag(
  companyId: string,
  token: string,
  candidateId: string,
  tagId: string,
): Promise<void> {
  await write<unknown>(
    companyId,
    token,
    'POST',
    `/candidates/${candidateId}/tags`,
    { tag: { id: Number(tagId) } },
  );
}
