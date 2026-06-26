// BambooHR ATS API client (Deno).
//
// Docs: https://documentation.bamboohr.com/reference/applicant-tracking-1
// Auth: HTTP Basic — the API key is the username, the password is any
// non-empty value (BambooHR's docs use "x"). We send `:x`, NOT the shared
// authHeaderBasic's empty password, because some BambooHR edges reject an
// empty password component.
// Base URL: https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1 — the
// recruiter's company subdomain is part of the path, stored at
// integrations.extras.company_subdomain (same posture as Workable's subdomain
// / Recruitee's company_id). The ATS surface lives under /applicant_tracking.
//
// IMPORTANT: BambooHR returns XML by default. Every request MUST send
// `Accept: application/json` or the JSON.parse below blows up.
//
// Rate limit: standard 429 with Retry-After, honored by fetchWithBackoff.
//
// Model mapping:
// - BambooHR "job" (opening) ↔ our requisition.
// - A candidate reaches a job through an "application" (one per applicant per
//   job). listCandidatesForRequisition lists a job's applications and keys each
//   normalized candidate by the APPLICATION id — that's the write target for
//   status changes and comments (same posture as Lever's opportunity id and
//   Teamtailor's job-application id). The applicant id lives in `raw`.
// - "Statuses" are global to the account (not per-job), like Lever / Workable —
//   listStages ignores the requisition arg and returns the account status list.
//
// Capabilities shipped here: reads + advance stage (change status) + add note
// (application comment). Deliberately NOT supported (the shell adapter's
// capabilities() is trimmed to match):
// - reject: BambooHR has no dedicated reject endpoint — rejection is just a
//   transition to a "rejected"-class status, so it's expressed as an
//   advance_stage action to that status, not a separate capability.
// - apply tag: the public ATS API exposes no tag vocabulary or apply-tag
//   endpoint, so there's nothing to enumerate or write.
// - send message / send template: not exposed by the public API.
//
// ⚠️ Needs sandbox confirmation (BambooHR's hosted reference renders
//   client-side and couldn't be scraped): the `paginationComplete` stop signal
//   on /applications, and whether the status-change body wants the status id as
//   a string or a number. Both are coded defensively and flagged below.

import { callGet, callWrite, MAX_PAGES } from './http.ts';

function baseUrl(companySubdomain: string): string {
  return `https://api.bamboohr.com/api/gateway.php/${
    encodeURIComponent(companySubdomain)
  }/v1/applicant_tracking`;
}

// Basic auth with the API key as username and "x" as the password — BambooHR's
// documented convention. (We don't reuse http.ts's authHeaderBasic because it
// sends an empty password.)
function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:x`)}`;
}

function headers(apiKey: string, write = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: authHeader(apiKey),
    Accept: 'application/json',
  };
  if (write) h['Content-Type'] = 'application/json';
  return h;
}

async function get<T>(
  companySubdomain: string,
  apiKey: string,
  path: string,
): Promise<T> {
  return callGet<T>(
    `${baseUrl(companySubdomain)}${path}`,
    headers(apiKey),
    { provider: 'BambooHR', route: path },
  );
}

async function write<T>(
  companySubdomain: string,
  apiKey: string,
  path: string,
  body: unknown,
): Promise<T> {
  return callWrite<T>(
    `${baseUrl(companySubdomain)}${path}`,
    'POST',
    headers(apiKey, true),
    body,
    { provider: 'BambooHR', route: path },
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
// BambooHR response shapes — only the fields we read. Many display fields come
// back as { id, label } objects, but BambooHR has historically also returned
// bare strings for some of them, so labelOf() tolerates both.
// ============================================================================

interface BambooLabel {
  id?: string | number;
  label?: string;
}
type LabelLike = BambooLabel | string | null | undefined;

interface BambooJob {
  id: string | number;
  title?: LabelLike;
  status?: LabelLike;
  department?: LabelLike;
  location?: LabelLike;
}
interface BambooApplicant {
  id?: string | number;
  firstName?: string;
  lastName?: string;
}
interface BambooApplication {
  id: string | number;
  applicant?: BambooApplicant;
  // Some BambooHR shapes flatten the name onto the application itself.
  firstName?: string;
  lastName?: string;
  status?: LabelLike;
}
interface BambooApplicationsResponse {
  applications?: BambooApplication[];
  // Present when BambooHR signals it has handed back the final page. Absent on
  // some accounts — we fall back to "stop on an empty page" (see callAppPage).
  paginationComplete?: boolean;
}
interface BambooStatus {
  id: string | number;
  name?: string;
  label?: string;
}

function labelOf(v: LabelLike): string | undefined {
  if (typeof v === 'string') return v;
  if (v && typeof v.label === 'string') return v.label;
  return undefined;
}

// ============================================================================
// Reads.
// ============================================================================

export async function testConnection(
  companySubdomain: string,
  apiKey: string,
): Promise<boolean> {
  // /statuses is the lightest authenticated ATS read — confirms the key, the
  // subdomain, and that the account has ATS access in one round-trip.
  await get<unknown>(companySubdomain, apiKey, '/statuses');
  return true;
}

export async function listRequisitions(
  companySubdomain: string,
  apiKey: string,
  _cursor?: string,
): Promise<NormPage<NormRequisition>> {
  // /jobs returns the full set of job summaries as a bare array (no pagination
  // envelope), so there's nothing to page — nextCursor is always null and the
  // cursor arg is ignored. We surface only open openings for sourcing; jobs
  // whose status we can't read are kept rather than silently dropped.
  const jobs = await get<BambooJob[]>(companySubdomain, apiKey, '/jobs');
  const items = (jobs ?? [])
    .filter((j) => {
      const status = labelOf(j.status)?.toLowerCase();
      return status === undefined || status === 'open';
    })
    .map((j): NormRequisition => ({
      externalId: String(j.id),
      title: labelOf(j.title) ?? '',
      department: labelOf(j.department),
      location: labelOf(j.location),
      raw: j,
    }));
  return { items, nextCursor: null };
}

// Fetch one page of a job's applications. The opaque cursor is the 1-based page
// number as a string ('' → page 1). nextCursor is the next page number when
// more data remains, else null. "More remains" prefers BambooHR's
// paginationComplete flag and falls back to "the page came back non-empty".
async function callAppPage(
  companySubdomain: string,
  apiKey: string,
  jobId: string,
  cursor: string | undefined,
): Promise<{ items: BambooApplication[]; nextCursor: string | null }> {
  const page = cursor && cursor.length > 0 ? Number(cursor) : 1;
  const res = await get<BambooApplicationsResponse>(
    companySubdomain,
    apiKey,
    `/applications?jobId=${encodeURIComponent(jobId)}&page=${page}`,
  );
  const items = res.applications ?? [];
  const done = res.paginationComplete === true || items.length === 0;
  return { items, nextCursor: done ? null : String(page + 1) };
}

export async function listCandidatesForRequisition(
  companySubdomain: string,
  apiKey: string,
  jobId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  const map = (a: BambooApplication): NormCandidate => {
    const first = a.applicant?.firstName ?? a.firstName;
    const last = a.applicant?.lastName ?? a.lastName;
    const fullName = [first, last]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .join(' ')
      .trim();
    return {
      // Key by the application id — the write target for status / comments.
      externalId: String(a.id),
      requisitionExternalId: jobId,
      fullName: fullName || `Candidate ${a.applicant?.id ?? a.id}`,
      raw: a,
    };
  };
  // No cursor → walk every page (nextCursor null); a cursor → one page + the
  // real next-page cursor.
  if (cursor === undefined) {
    const all: BambooApplication[] = [];
    let c: string | undefined = '';
    for (let i = 0; i < MAX_PAGES; i++) {
      const { items, nextCursor } = await callAppPage(
        companySubdomain,
        apiKey,
        jobId,
        c,
      );
      all.push(...items);
      if (!nextCursor) break;
      c = nextCursor;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await callAppPage(
    companySubdomain,
    apiKey,
    jobId,
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listStages(
  companySubdomain: string,
  apiKey: string,
  _jobId: string,
): Promise<NormStage[]> {
  // BambooHR statuses are global to the account, not per-job — listStages
  // ignores the requisition arg (same posture as Lever / Workable).
  const statuses = await get<BambooStatus[]>(
    companySubdomain,
    apiKey,
    '/statuses',
  );
  return (statuses ?? []).map((s) => ({
    id: String(s.id),
    name: s.name ?? s.label ?? '',
  }));
}

export function listTags(
  _companySubdomain: string,
  _apiKey: string,
): Promise<NormTag[]> {
  // The public ATS API exposes no tag vocabulary endpoint, so there's nothing
  // to enumerate for the settings tag picker. (capabilities().canApplyTag is
  // false, so this isn't reached in practice — kept for interface parity.)
  return Promise.resolve([]);
}

// ============================================================================
// Writes — target the application id directly.
// ============================================================================

export async function changeStatus(
  companySubdomain: string,
  apiKey: string,
  applicationId: string,
  statusId: string,
): Promise<void> {
  // POST /applications/{id}/status with { status: <statusId> }. statusId comes
  // from listStages (a stringified BambooHR status id). ⚠️ Verify against a
  // sandbox whether BambooHR wants the id as a string or a number here.
  await write<unknown>(
    companySubdomain,
    apiKey,
    `/applications/${encodeURIComponent(applicationId)}/status`,
    { status: statusId },
  );
}

export async function addComment(
  companySubdomain: string,
  apiKey: string,
  applicationId: string,
  text: string,
): Promise<void> {
  // POST /applications/{id}/comments with { type: 'comment', comment: <text> }.
  await write<unknown>(
    companySubdomain,
    apiKey,
    `/applications/${encodeURIComponent(applicationId)}/comments`,
    { type: 'comment', comment: text },
  );
}
