// iCIMS Talent Cloud API client (Deno) — ⚠️ EXPERIMENTAL / UNVERIFIED SCAFFOLD.
//
// ============================================================================
// THIS CLIENT IS SPECULATIVE. It is NOT wired into the connect screen
// (PROVIDER_META.icims.ready is false and it's absent from CONNECTABLE_PROVIDERS),
// so nothing invokes it in production. iCIMS is partner-gated with no self-serve
// sandbox, and its object FIELD shapes are not publicly documented — the request
// bodies and field mappings below are best-effort guesses from the public
// endpoint list. The contract test validates NORMALIZATION against fixtures we
// authored, NOT real iCIMS responses. Everything here must be re-verified
// against a partner sandbox before flipping the adapter to ready:true.
// See docs/ats-credentials-guide.md (Tier 4) and the icims shell header.
// ============================================================================
//
// Auth: OAuth 2.0 client-credentials. Region-specific auth servers
// (login.icims.com / .eu / .ca). We default to the US token endpoint. The
// client_secret is the Vault credential; client_id + customer_id ride in extras.
// Base: https://api.icims.com/customers/{customerId}
//
// Read model (per the public endpoint list): search-then-fetch.
//   - POST /customers/{id}/search/jobs             → { searchResults: [{ id }] }
//   - GET  /customers/{id}/jobs/{jobId}            → job object (fields guessed)
//   - POST /customers/{id}/search/applicantworkflows (filtered by job)
//   - GET  /customers/{id}/applicantworkflows/{id} → application object
// Object field keys (jobtitle, firstname, …) are UNVERIFIED — pickStr() tries
// several plausible keys and tolerates {value}/{label} nesting. Pagination is
// NOT handled (single search page); nextCursor is always null.

import { fetchClientCredentialsToken, MAX_PAGES, pooledMap } from './http.ts';
import { callGet, callWrite } from './http.ts';

const TOKEN_URL = 'https://login.icims.com/oauth/token';

function baseUrl(customerId: string): string {
  return `https://api.icims.com/customers/${encodeURIComponent(customerId)}`;
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
// iCIMS shapes — deliberately loose; fields are unverified.
// ============================================================================

interface ICIMSSearchResult {
  id?: string | number;
  url?: string;
}
interface ICIMSSearchResponse {
  searchResults?: ICIMSSearchResult[];
}
type ICIMSObject = Record<string, unknown>;

// Pull the first plausible string from a set of candidate keys, tolerating
// iCIMS's habit of nesting values as { value } or { label }.
function pickStr(obj: ICIMSObject, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.value === 'string' && o.value.length > 0) return o.value;
      if (typeof o.label === 'string' && o.label.length > 0) return o.label;
    }
  }
  return undefined;
}

async function getToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  return fetchClientCredentialsToken(
    TOKEN_URL,
    clientId,
    clientSecret,
    'iCIMS',
  );
}

async function search(
  token: string,
  customerId: string,
  type: string,
  body: unknown,
): Promise<ICIMSSearchResult[]> {
  const res = await callWrite<ICIMSSearchResponse>(
    `${baseUrl(customerId)}/search/${type}`,
    'POST',
    headers(token, true),
    body ?? {},
    { provider: 'iCIMS', route: `/search/${type}` },
  );
  return res?.searchResults ?? [];
}

async function fetchObject(
  token: string,
  customerId: string,
  type: string,
  id: string,
): Promise<ICIMSObject> {
  return callGet<ICIMSObject>(
    `${baseUrl(customerId)}/${type}/${encodeURIComponent(id)}`,
    headers(token),
    { provider: 'iCIMS', route: `/${type}/{id}` },
  );
}

// ============================================================================
// Reads.
// ============================================================================

export async function testConnection(
  clientId: string,
  clientSecret: string,
  customerId: string,
): Promise<boolean> {
  const token = await getToken(clientId, clientSecret);
  await search(token, customerId, 'jobs', {});
  return true;
}

export async function listRequisitions(
  clientId: string,
  clientSecret: string,
  customerId: string,
  _cursor?: string,
): Promise<NormPage<NormRequisition>> {
  const token = await getToken(clientId, clientSecret);
  // Search returns bare ids; fetch each job object (bounded fan-out). Cap the
  // number of detail fetches so a huge result set can't fan out unbounded.
  const results = (await search(token, customerId, 'jobs', {})).slice(
    0,
    MAX_PAGES * 10,
  );
  const ids = results
    .map((r) => (r.id !== undefined ? String(r.id) : ''))
    .filter((id) => id.length > 0);
  const objects = await pooledMap(
    ids,
    (id) => fetchObject(token, customerId, 'jobs', id),
  );
  const items = objects.map((o, i): NormRequisition => ({
    externalId: ids[i]!,
    title: pickStr(o, ['jobtitle', 'title', 'positiontitle']) ?? '',
    department: pickStr(o, ['department', 'jobdepartment']),
    location: pickStr(o, ['joblocation', 'location', 'city']),
    raw: o,
  }));
  return { items, nextCursor: null };
}

export async function listCandidatesForRequisition(
  clientId: string,
  clientSecret: string,
  customerId: string,
  jobId: string,
  _cursor?: string,
): Promise<NormPage<NormCandidate>> {
  const token = await getToken(clientId, clientSecret);
  // Filter applicant workflows to the job. The exact filter field name is a
  // guess — iCIMS search filters take { name, value } pairs.
  const body = {
    filters: [{ name: 'applicantworkflow.job', value: jobId }],
  };
  const results = (await search(token, customerId, 'applicantworkflows', body))
    .slice(0, MAX_PAGES * 10);
  const ids = results
    .map((r) => (r.id !== undefined ? String(r.id) : ''))
    .filter((id) => id.length > 0);
  const objects = await pooledMap(
    ids,
    (id) => fetchObject(token, customerId, 'applicantworkflows', id),
  );
  const items = objects.map((o, i): NormCandidate => {
    // Name may live on the workflow or on a nested associated profile; the
    // real shape likely needs a separate /people fetch (UNVERIFIED).
    const profile = (o.associatedprofile ?? o.profile ?? {}) as ICIMSObject;
    const first = pickStr(o, ['firstname']) ?? pickStr(profile, ['firstname']);
    const last = pickStr(o, ['lastname']) ?? pickStr(profile, ['lastname']);
    const fullName = [first, last]
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .join(' ')
      .trim();
    return {
      externalId: ids[i]!,
      requisitionExternalId: jobId,
      fullName: fullName || `Candidate ${ids[i]}`,
      raw: o,
    };
  });
  return { items, nextCursor: null };
}

export function listStages(
  _clientId: string,
  _clientSecret: string,
  _customerId: string,
  _jobId: string,
): Promise<NormStage[]> {
  // No verified status/workflow-step enumeration endpoint yet.
  return Promise.resolve([]);
}

export function listTags(
  _clientId: string,
  _clientSecret: string,
  _customerId: string,
): Promise<NormTag[]> {
  return Promise.resolve([]);
}
