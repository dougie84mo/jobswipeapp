// Workday Recruiting REST API client (Deno) — ⚠️ EXPERIMENTAL / UNVERIFIED.
//
// ============================================================================
// THIS CLIENT IS SPECULATIVE. It is NOT wired into the connect screen
// (PROVIDER_META.workday.ready is false and it's absent from
// CONNECTABLE_PROVIDERS), so nothing invokes it in production. Workday is
// partner-gated (ISV agreement; no pre-deal sandbox — the tenant comes from a
// customer). Two things here are known-shaky and MUST be verified against a real
// tenant before flipping to ready:true:
//   1. AUTH. Workday's Recruiting REST API points to the 3-legged Authorization
//      Code grant. This scaffold uses a client-credentials token exchange as a
//      PLACEHOLDER — a real integration will likely need an OAuth
//      redirect/refresh-token flow (the ats-oauth-callback edge fn is the stub).
//   2. The candidates endpoint + fields are UNDOCUMENTED publicly. GET
//      /jobRequisitions is documented (offset/limit, { data, total }); the
//      candidate call below is a best guess.
// The contract test validates NORMALIZATION against fixtures we authored, not
// real Workday responses. See docs/ats-credentials-guide.md (Tier 4).
// ============================================================================
//
// Auth: client_secret is the Vault credential; client_id + tenant ride in extras
// (extras.client_id, extras.tenant_subdomain).
// Token (placeholder): https://{tenant}.workday.com/ccx/oauth2/token
// Base: https://{tenant}.workday.com/ccx/api/recruiting/v41.2
// Workday REST wraps collections as { data: [{ id, descriptor }], total } and
// uses offset/limit pagination; `descriptor` is the human-readable label.

import { callGet, fetchClientCredentialsToken } from './http.ts';

const API_VERSION = 'v41.2';
const PAGE_SIZE = 100;

function tokenUrl(tenant: string): string {
  return `https://${tenant}.workday.com/ccx/oauth2/token`;
}
function baseUrl(tenant: string): string {
  return `https://${tenant}.workday.com/ccx/api/recruiting/${API_VERSION}`;
}
function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
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
// Workday REST shapes — the common { data, total } envelope with { id,
// descriptor } instances.
// ============================================================================

interface WorkdayInstance {
  id?: string;
  descriptor?: string;
}
interface WorkdayList {
  data?: WorkdayInstance[];
  total?: number;
}

async function getToken(
  clientId: string,
  clientSecret: string,
  tenant: string,
): Promise<string> {
  // PLACEHOLDER grant — see file header (Workday recruiting likely needs
  // authorization-code / refresh-token, not client-credentials).
  return fetchClientCredentialsToken(
    tokenUrl(tenant),
    clientId,
    clientSecret,
    'Workday',
  );
}

// Fetch one offset/limit page of a { data, total } collection. The opaque cursor
// is the offset ('' → 0). nextCursor is the next offset while more remain.
async function getPage(
  token: string,
  tenant: string,
  path: string,
  cursor: string | undefined,
): Promise<{ items: WorkdayInstance[]; nextCursor: string | null }> {
  const offset = cursor && cursor.length > 0 ? Number(cursor) : 0;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${
    baseUrl(tenant)
  }${path}${sep}limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await callGet<WorkdayList>(url, headers(token), {
    provider: 'Workday',
    route: path,
  });
  const items = res.data ?? [];
  const total = typeof res.total === 'number' ? res.total : undefined;
  const nextOffset = offset + PAGE_SIZE;
  const more = total !== undefined
    ? nextOffset < total
    : items.length === PAGE_SIZE;
  return { items, nextCursor: more ? String(nextOffset) : null };
}

// ============================================================================
// Reads.
// ============================================================================

export async function testConnection(
  clientId: string,
  clientSecret: string,
  tenant: string,
): Promise<boolean> {
  const token = await getToken(clientId, clientSecret, tenant);
  await callGet(
    `${baseUrl(tenant)}/jobRequisitions?limit=1`,
    headers(token),
    { provider: 'Workday', route: '/jobRequisitions' },
  );
  return true;
}

export async function listRequisitions(
  clientId: string,
  clientSecret: string,
  tenant: string,
  cursor?: string,
): Promise<NormPage<NormRequisition>> {
  const token = await getToken(clientId, clientSecret, tenant);
  const map = (r: WorkdayInstance): NormRequisition => ({
    externalId: String(r.id ?? ''),
    title: r.descriptor ?? '',
    raw: r,
  });
  if (cursor === undefined) {
    const all: WorkdayInstance[] = [];
    let c: string | undefined = '';
    for (let i = 0; i < 20; i++) { // hard page cap for the scaffold
      const { items, nextCursor } = await getPage(
        token,
        tenant,
        '/jobRequisitions',
        c,
      );
      all.push(...items);
      if (!nextCursor) break;
      c = nextCursor;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await getPage(
    token,
    tenant,
    '/jobRequisitions',
    cursor,
  );
  return { items: items.map(map), nextCursor };
}

export async function listCandidatesForRequisition(
  clientId: string,
  clientSecret: string,
  tenant: string,
  jobRequisitionId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  const token = await getToken(clientId, clientSecret, tenant);
  // UNVERIFIED endpoint shape — the real candidate/application resource for a
  // requisition isn't publicly documented. This assumes a nested collection.
  const path = `/jobRequisitions/${
    encodeURIComponent(jobRequisitionId)
  }/candidates`;
  const map = (c: WorkdayInstance): NormCandidate => ({
    externalId: String(c.id ?? ''),
    requisitionExternalId: jobRequisitionId,
    fullName: c.descriptor ?? `Candidate ${c.id ?? ''}`,
    raw: c,
  });
  if (cursor === undefined) {
    const all: WorkdayInstance[] = [];
    let cur: string | undefined = '';
    for (let i = 0; i < 20; i++) {
      const { items, nextCursor } = await getPage(token, tenant, path, cur);
      all.push(...items);
      if (!nextCursor) break;
      cur = nextCursor;
    }
    return { items: all.map(map), nextCursor: null };
  }
  const { items, nextCursor } = await getPage(token, tenant, path, cursor);
  return { items: items.map(map), nextCursor };
}

export function listStages(
  _clientId: string,
  _clientSecret: string,
  _tenant: string,
  _jobRequisitionId: string,
): Promise<NormStage[]> {
  return Promise.resolve([]);
}

export function listTags(
  _clientId: string,
  _clientSecret: string,
  _tenant: string,
): Promise<NormTag[]> {
  return Promise.resolve([]);
}
