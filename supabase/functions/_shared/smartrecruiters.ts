// SmartRecruiters Customer API client (Deno).
//
// Docs: https://developers.smartrecruiters.com/docs (Customer API).
// This is the project's FIRST OAuth provider. SmartRecruiters supports two auth
// modes; we use **OAuth 2.0 client-credentials** (the recommended mode for
// server integrations). The recruiter supplies a client_id + client_secret at
// connect time. We exchange them for a short-lived bearer access token, then
// call the API with `Authorization: Bearer <token>`.
//
// Credential storage split (no app-side OAuth redirect needed — this is a
// server-to-server grant):
//   - client_secret → Vault (the integration's `credentials`), passed here as
//     `clientSecret`.
//   - client_id     → integrations.extras.client_id (an identifier, not the
//     secret), passed here as `clientId`.
// The proxy reads both and hands them to every function below. Each exported
// function exchanges a token ONCE up front and reuses it for its own HTTP calls
// (edge invocations are short-lived, so there's no cross-invocation token cache;
// re-exchanging per call is cheap and keeps the client stateless).
//
// Base API URL: https://api.smartrecruiters.com
// Token endpoint: https://api.smartrecruiters.com/identity/oauth/token
//   POST, application/x-www-form-urlencoded,
//   body: grant_type=client_credentials & client_id & client_secret
//   → { access_token, token_type: "bearer", expires_in }
//
// Model mapping:
// - SmartRecruiters "job" ↔ our requisition.
// - A candidate is associated to a job; the write target is the pair
//   (candidateId, jobId) via PUT /candidates/{candidateId}/jobs/{jobId}/status.
//   So our candidate externalId is the SmartRecruiters candidate id, and writes
//   thread requisitionExternalId (the jobId) through — which the AtsAdapter
//   write inputs already carry.
// - "Stages": SmartRecruiters has a fixed top-level application `status`
//   vocabulary (LEAD/NEW/IN_REVIEW/INTERVIEW/OFFERED/HIRED + terminal
//   REJECTED/WITHDRAWN). There's no API to enumerate it and subStatuses are
//   company-configurable, so listStages ships the documented main statuses as a
//   constant. advance_stage PUTs one of these ids as `status`.
//
// Capabilities shipped here: reads + advance stage + reject (status=REJECTED via
// the same PUT). Deferred (shell adapter's capabilities() trimmed to match):
// - notes: the candidate-note path (/messages/shares) needs a `shareWith` user
//   reference we don't capture at connect time.
// - tags: no confirmed tag-vocabulary / apply-tag endpoint in the Customer API.
//
// ⚠️ Needs sandbox confirmation (free SmartRecruiters sandbox available; live
//   reference renders as interactive Swagger and couldn't be scraped):
//   - GET /jobs/{jobId}/candidates path + response field names.
//   - pageId cursor pagination shape (`content` + `nextPageId`) vs offset/limit.
//   - the exact status tokens (notably OFFER vs OFFERED).

import { callGet, callWrite, fetchWithBackoff, HttpError } from './http.ts';

const BASE_URL = 'https://api.smartrecruiters.com';
const TOKEN_URL = `${BASE_URL}/identity/oauth/token`;
const PAGE_SIZE = 100;

// ============================================================================
// OAuth client-credentials token exchange.
// ============================================================================

async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  // Form-urlencoded body — NOT JSON, so we can't reuse callWrite (which always
  // JSON-stringifies). Hand-roll the POST and apply the same non-2xx handling.
  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  const res = await fetchWithBackoff(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form.toString(),
  });
  if (!res.ok) {
    // Drain the body (it may echo the submitted credentials) and surface only
    // the status — same PII-free posture as http.ts.
    await res.body?.cancel();
    throw new HttpError(
      'SmartRecruiters',
      'POST /identity/oauth/token',
      res.status,
      res.statusText,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('SmartRecruiters: token response missing access_token');
  }
  return json.access_token;
}

function headers(token: string, write = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (write) h['Content-Type'] = 'application/json';
  return h;
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
// SmartRecruiters response shapes — only the fields we read. The ListResult
// envelope wraps collections in `content` with a `nextPageId` cursor.
// ============================================================================

interface SrLabel {
  id?: string;
  label?: string;
}
interface SrLocation {
  city?: string;
  region?: string;
  country?: string;
}
interface SrJob {
  id: string;
  title?: string;
  status?: string;
  department?: SrLabel | string;
  location?: SrLocation;
}
interface SrCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: SrLocation;
}
interface SrList<T> {
  content?: T[];
  nextPageId?: string | null;
  totalFound?: number;
}

function labelOf(v: SrLabel | string | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (v && typeof v.label === 'string') return v.label;
  return undefined;
}

function locationStr(loc: SrLocation | undefined): string | undefined {
  if (!loc) return undefined;
  const parts = [loc.city, loc.region, loc.country].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// ============================================================================
// Reads.
// ============================================================================

// Fetch one page of a `content`/`nextPageId` collection. The opaque cursor is
// the pageId ('' → first page). nextCursor is `nextPageId`, else null.
async function getPage<T>(
  token: string,
  firstUrl: string,
  cursor: string | undefined,
): Promise<SrList<T>> {
  const url = cursor && cursor.length > 0
    ? `${firstUrl}&pageId=${encodeURIComponent(cursor)}`
    : firstUrl;
  return callGet<SrList<T>>(url, headers(token), {
    provider: 'SmartRecruiters',
    route: firstUrl,
  });
}

export async function testConnection(
  clientId: string,
  clientSecret: string,
): Promise<boolean> {
  const token = await getAccessToken(clientId, clientSecret);
  // Lightest authenticated read — also proves the token's scope covers jobs.
  await callGet(`${BASE_URL}/jobs?limit=1`, headers(token), {
    provider: 'SmartRecruiters',
    route: '/jobs',
  });
  return true;
}

export async function listRequisitions(
  clientId: string,
  clientSecret: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  const token = await getAccessToken(clientId, clientSecret);
  // No status filter — SmartRecruiters job statuses are a wide enum and we'd
  // rather not drop a req on a guessed token; the recruiter picks the job.
  const firstUrl = `${BASE_URL}/jobs?limit=${PAGE_SIZE}`;
  const map = (j: SrJob): NormRequisition => ({
    externalId: j.id,
    title: j.title ?? '',
    department: labelOf(j.department),
    location: locationStr(j.location),
    raw: j,
  });
  // No cursor → walk all pages (nextCursor null); a cursor → one page + the
  // real nextPageId cursor.
  if (cursor === undefined) {
    const all: SrJob[] = [];
    let c: string | undefined = '';
    for (;;) {
      const page: SrList<SrJob> = await getPage<SrJob>(token, firstUrl, c);
      all.push(...(page.content ?? []));
      const next = page.nextPageId ?? null;
      if (!next) break;
      c = next;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const page: SrList<SrJob> = await getPage<SrJob>(token, firstUrl, cursor);
  return {
    items: (page.content ?? []).map(map),
    nextCursor: page.nextPageId ?? null,
  };
}

export async function listCandidatesForRequisition(
  clientId: string,
  clientSecret: string,
  jobId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  const token = await getAccessToken(clientId, clientSecret);
  const firstUrl = `${BASE_URL}/jobs/${
    encodeURIComponent(jobId)
  }/candidates?limit=${PAGE_SIZE}`;
  const map = (c: SrCandidate): NormCandidate => {
    const fullName = [c.firstName, c.lastName]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .join(' ')
      .trim();
    return {
      externalId: c.id,
      requisitionExternalId: jobId,
      fullName: fullName || `Candidate ${c.id}`,
      location: locationStr(c.location),
      raw: c,
    };
  };
  if (cursor === undefined) {
    const all: SrCandidate[] = [];
    let cur: string | undefined = '';
    for (;;) {
      const page: SrList<SrCandidate> = await getPage<SrCandidate>(
        token,
        firstUrl,
        cur,
      );
      all.push(...(page.content ?? []));
      const next = page.nextPageId ?? null;
      if (!next) break;
      cur = next;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const page: SrList<SrCandidate> = await getPage<SrCandidate>(
    token,
    firstUrl,
    cursor,
  );
  return {
    items: (page.content ?? []).map(map),
    nextCursor: page.nextPageId ?? null,
  };
}

// SmartRecruiters main application statuses. No API enumerates these and
// subStatuses are company-configurable, so we ship the documented main-status
// vocabulary as a constant. advance_stage PUTs one of these ids as `status`.
// ⚠️ Confirm the exact tokens (esp. OFFER vs OFFERED) against a sandbox.
const STATUSES: NormStage[] = [
  { id: 'LEAD', name: 'Lead', order: 0 },
  { id: 'NEW', name: 'New', order: 1 },
  { id: 'IN_REVIEW', name: 'In Review', order: 2 },
  { id: 'INTERVIEW', name: 'Interview', order: 3 },
  { id: 'OFFERED', name: 'Offered', order: 4 },
  { id: 'HIRED', name: 'Hired', order: 5 },
];

export function listStages(): Promise<NormStage[]> {
  return Promise.resolve(STATUSES);
}

export function listTags(): Promise<NormTag[]> {
  // No confirmed tag-vocabulary endpoint in the Customer API.
  return Promise.resolve([]);
}

// ============================================================================
// Writes — PUT the (candidate, job) application status.
// ============================================================================

async function putStatus(
  clientId: string,
  clientSecret: string,
  candidateId: string,
  jobId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const token = await getAccessToken(clientId, clientSecret);
  await callWrite(
    `${BASE_URL}/candidates/${encodeURIComponent(candidateId)}/jobs/${
      encodeURIComponent(jobId)
    }/status`,
    'PUT',
    headers(token, true),
    body,
    {
      provider: 'SmartRecruiters',
      route: `/candidates/${candidateId}/jobs/${jobId}/status`,
    },
  );
}

export async function updateStatus(
  clientId: string,
  clientSecret: string,
  candidateId: string,
  jobId: string,
  statusId: string,
): Promise<void> {
  await putStatus(clientId, clientSecret, candidateId, jobId, {
    status: statusId,
  });
}

export async function rejectCandidate(
  clientId: string,
  clientSecret: string,
  candidateId: string,
  jobId: string,
  reason: string | undefined,
): Promise<void> {
  // Reject is the terminal REJECTED status on the same PUT. Forward an optional
  // reason when the action descriptor carries one.
  const body: Record<string, unknown> = { status: 'REJECTED' };
  if (reason) body.reason = reason;
  await putStatus(clientId, clientSecret, candidateId, jobId, body);
}
