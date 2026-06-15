// Adapter contract tests — the gate every real Deno client must pass.
//
// Each client is fed recorded-shape provider responses (via a stubbed fetch)
// and must emit valid normalized shapes: required fields present, every id
// stringified, no raw provider fields leaking outside `raw`, and nextCursor
// typed string | null. This is also the behavior gate for the P1a http.ts
// refactor — normalized output must be unchanged.
//
// Run: deno test --allow-all supabase/functions/_shared/__tests__/contract.test.ts

import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import * as gh from '../greenhouse.ts';
import * as ashby from '../ashby.ts';
import * as lever from '../lever.ts';
import * as workable from '../workable.ts';
import * as recruitee from '../recruitee.ts';
import * as teamtailor from '../teamtailor.ts';
import * as manatal from '../manatal.ts';
import { listCandidatesForProvider } from '../dispatch.ts';

import {
  ashby as ashbyFx,
  greenhouse as ghFx,
  lever as leverFx,
  manatal as manatalFx,
  recruitee as recruiteeFx,
  teamtailor as ttFx,
  workable as workableFx,
} from '../__fixtures__/responses.ts';

// ============================================================================
// fetch router — maps each outbound request to a fixture by URL substring.
// An unmatched request throws loudly so a missing fixture fails the test.
// ============================================================================
interface Route {
  method?: string;
  match: string; // substring that must appear in the request URL
  body: unknown;
  status?: number;
}

function installRouter(routes: Route[]): () => void {
  const real = globalThis.fetch;
  const realAbortTimeout = AbortSignal.timeout;
  // Avoid AbortSignal.timeout's real timer leaking an op (stubbed fetch
  // resolves before it fires).
  AbortSignal.timeout =
    (() => new AbortController().signal) as typeof AbortSignal.timeout;
  // deno-lint-ignore no-explicit-any
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === 'string'
      ? input
      : (input?.url ?? String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    const route = routes.find(
      (r) => (!r.method || r.method === method) && url.includes(r.match),
    );
    if (!route) throw new Error(`contract: no fixture for ${method} ${url}`);
    return Promise.resolve(
      new Response(JSON.stringify(route.body), {
        status: route.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }) as typeof fetch;
  return () => {
    globalThis.fetch = real;
    AbortSignal.timeout = realAbortTimeout;
  };
}

// ============================================================================
// Normalized-shape assertions.
// ============================================================================
const REQ_KEYS = new Set([
  'externalId',
  'title',
  'department',
  'location',
  'raw',
]);
const CAND_KEYS = new Set([
  'externalId',
  'requisitionExternalId',
  'fullName',
  'headline',
  'location',
  'resumeUrl',
  'photoUrl',
  'skills',
  'yearsExperience',
  'raw',
]);
const STAGE_KEYS = new Set(['id', 'name', 'order']);
const TAG_KEYS = new Set(['id', 'name']);

// deno-lint-ignore no-explicit-any
function assertOnlyKeys(obj: any, allowed: Set<string>, label: string): void {
  for (const k of Object.keys(obj)) {
    assert(allowed.has(k), `${label}: key "${k}" leaked outside raw`);
  }
}

// deno-lint-ignore no-explicit-any
function assertPage(page: any): void {
  assert(Array.isArray(page.items), 'page.items must be an array');
  assert(
    page.nextCursor === null || typeof page.nextCursor === 'string',
    'nextCursor must be string | null',
  );
}

// deno-lint-ignore no-explicit-any
function assertRequisition(r: any): void {
  assertEquals(
    typeof r.externalId,
    'string',
    'requisition.externalId must be string',
  );
  assertEquals(typeof r.title, 'string', 'requisition.title must be string');
  assert('raw' in r, 'requisition must retain raw');
  assertOnlyKeys(r, REQ_KEYS, 'requisition');
}

// deno-lint-ignore no-explicit-any
function assertCandidate(c: any): void {
  assertEquals(
    typeof c.externalId,
    'string',
    'candidate.externalId must be string',
  );
  assertEquals(
    typeof c.requisitionExternalId,
    'string',
    'candidate.requisitionExternalId must be string',
  );
  assertEquals(
    typeof c.fullName,
    'string',
    'candidate.fullName must be string',
  );
  assert('raw' in c, 'candidate must retain raw');
  assertOnlyKeys(c, CAND_KEYS, 'candidate');
}

// deno-lint-ignore no-explicit-any
function assertStage(s: any): void {
  assertEquals(typeof s.id, 'string', 'stage.id must be string');
  assertEquals(typeof s.name, 'string', 'stage.name must be string');
  assertOnlyKeys(s, STAGE_KEYS, 'stage');
}

// deno-lint-ignore no-explicit-any
function assertTag(t: any): void {
  assertEquals(typeof t.id, 'string', 'tag.id must be string');
  assertEquals(typeof t.name, 'string', 'tag.name must be string');
  assertOnlyKeys(t, TAG_KEYS, 'tag');
}

// ============================================================================
// Greenhouse (numeric ids -> must stringify)
// ============================================================================
Deno.test('greenhouse: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: 'jobs?status=open', body: ghFx.jobs },
    { match: '/applications', body: ghFx.applications },
    { match: '/candidates/', body: ghFx.candidate },
    { match: '/stages', body: ghFx.stages },
    { match: '/tags', body: ghFx.tags },
  ]);
  try {
    const reqs = await gh.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, '101'); // numeric 101 -> '101'

    const cands = await gh.listCandidatesForRequisition('k', '101');
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, '7001');
    assertEquals(cands.items[0]!.requisitionExternalId, '101');

    const stages = await gh.listStages('k', '101');
    stages.forEach(assertStage);
    // Only the active stage should survive.
    assertEquals(stages.length, 1);

    const tags = await gh.listTags('k');
    tags.forEach(assertTag);
    assertEquals(tags[0]!.id, '200');
  } finally {
    restore();
  }
});

// ============================================================================
// Ashby (string ids, POST + envelope; also covers single-page cursor)
// ============================================================================
Deno.test('ashby: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: 'jobInterviewPlan.info', body: ashbyFx.interviewPlan },
    { match: 'candidateTag.list', body: ashbyFx.candidateTagList },
    { match: 'candidate.info', body: ashbyFx.candidateInfo },
    { match: 'application.list', body: ashbyFx.applicationList },
    { match: 'job.list', body: ashbyFx.jobList },
  ]);
  try {
    const reqs = await ashby.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);

    const cands = await ashby.listCandidatesForRequisition('k', 'job_a1');
    assertPage(cands);
    cands.items.forEach(assertCandidate);

    const stages = await ashby.listStages('k', 'job_a1');
    stages.forEach(assertStage);

    const tags = await ashby.listTags('k');
    tags.forEach(assertTag);
  } finally {
    restore();
  }
});

Deno.test('ashby: single-page cursor returns the real nextCursor', async () => {
  const restore = installRouter([{
    match: 'job.list',
    body: ashbyFx.jobListHasMore,
  }]);
  try {
    const reqs = await ashby.listRequisitions('k', ''); // '' -> first page only
    assertPage(reqs);
    assertEquals(reqs.nextCursor, 'CURSOR_2');
    reqs.items.forEach(assertRequisition);
  } finally {
    restore();
  }
});

// ============================================================================
// Lever (string ids, offset envelope; covers single-page cursor)
// ============================================================================
Deno.test('lever: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/postings', body: leverFx.postings },
    { match: '/opportunities', body: leverFx.opportunities },
    { match: '/stages', body: leverFx.stages },
    { match: '/tags', body: leverFx.tags },
  ]);
  try {
    const reqs = await lever.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);

    const cands = await lever.listCandidatesForRequisition('k', 'post_l1');
    assertPage(cands);
    cands.items.forEach(assertCandidate);

    const stages = await lever.listStages('k', 'post_l1');
    stages.forEach(assertStage);

    const tags = await lever.listTags('k');
    tags.forEach(assertTag);
  } finally {
    restore();
  }
});

Deno.test('lever: single-page cursor returns the real next offset', async () => {
  const restore = installRouter([{
    match: '/postings',
    body: leverFx.postingsHasNext,
  }]);
  try {
    const reqs = await lever.listRequisitions('k', '');
    assertEquals(reqs.nextCursor, 'OFFSET_2');
  } finally {
    restore();
  }
});

// ============================================================================
// Workable (string ids, next-URL pagination; covers single-page cursor)
// ============================================================================
Deno.test('workable: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/candidates', body: workableFx.candidates },
    { match: 'state=published', body: workableFx.jobs },
    { match: '/stages', body: workableFx.stages },
    { match: '/tags', body: workableFx.tags },
  ]);
  try {
    const reqs = await workable.listRequisitions('acme', 't');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);

    const cands = await workable.listCandidatesForRequisition(
      'acme',
      't',
      'ABC123',
    );
    assertPage(cands);
    cands.items.forEach(assertCandidate);

    const stages = await workable.listStages('acme', 't', 'ABC123');
    stages.forEach(assertStage);

    const tags = await workable.listTags('acme', 't');
    tags.forEach(assertTag);
  } finally {
    restore();
  }
});

Deno.test('workable: single-page cursor returns the real next URL', async () => {
  const restore = installRouter([{
    match: 'state=published',
    body: workableFx.jobsHasNext,
  }]);
  try {
    const reqs = await workable.listRequisitions('acme', 't', '');
    assertEquals(
      reqs.nextCursor,
      'https://acme.workable.com/spi/v3/jobs?since_id=wj1',
    );
  } finally {
    restore();
  }
});

// ============================================================================
// Recruitee (numeric ids -> must stringify)
// ============================================================================
Deno.test('recruitee: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: 'default_stages', body: recruiteeFx.stages },
    { match: '/candidates', body: recruiteeFx.candidates },
    { match: 'status=published', body: recruiteeFx.offers },
    { match: '/tags', body: recruiteeFx.tags },
  ]);
  try {
    const reqs = await recruitee.listRequisitions('c', 't');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, '301');

    const cands = await recruitee.listCandidatesForRequisition('c', 't', '301');
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, '9001');

    const stages = await recruitee.listStages('c', 't', '301');
    stages.forEach(assertStage);
    assertEquals(stages[0]!.id, '50');

    const tags = await recruitee.listTags('c', 't');
    tags.forEach(assertTag);
    assertEquals(tags[0]!.id, '400');
  } finally {
    restore();
  }
});

// ============================================================================
// Teamtailor (JSON:API; candidate externalId IS the job-application id)
// ============================================================================
Deno.test('teamtailor: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/job-applications', body: ttFx.applications },
    { match: 'filter[status]=open', body: ttFx.jobs },
    { match: '/stages', body: ttFx.stages },
  ]);
  try {
    const reqs = await teamtailor.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, 'job_tt1');

    const cands = await teamtailor.listCandidatesForRequisition('k', 'job_tt1');
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    // externalId is the job-application id, not the candidate id.
    assertEquals(cands.items[0]!.externalId, 'app_tt1');
    assertEquals(cands.items[0]!.fullName, 'Tess Sample');

    const stages = await teamtailor.listStages('k', 'job_tt1');
    stages.forEach(assertStage);
    assertEquals(stages[0]!.id, 'stg_tt1');

    // No tag vocabulary endpoint — listTags is intentionally empty.
    const tags = await teamtailor.listTags('k');
    assertEquals(tags.length, 0);
  } finally {
    restore();
  }
});

Deno.test('teamtailor: single-page cursor returns the links.next URL', async () => {
  const restore = installRouter([
    { match: 'filter[status]=open', body: ttFx.jobsHasNext },
  ]);
  try {
    const reqs = await teamtailor.listRequisitions('k', '');
    assertEquals(
      reqs.nextCursor,
      'https://api.teamtailor.com/v1/jobs?page[number]=2',
    );
  } finally {
    restore();
  }
});

// ============================================================================
// Manatal (DRF pagination; candidate externalId IS the match id; reads-only)
// ============================================================================
Deno.test('manatal: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/matches/', body: manatalFx.matches },
    { match: 'match-stages', body: manatalFx.matchStages },
    { match: 'status=open', body: manatalFx.jobs },
  ]);
  try {
    const reqs = await manatal.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, '701'); // numeric -> string

    const cands = await manatal.listCandidatesForRequisition('k', '701');
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    // externalId is the match id, not the candidate id.
    assertEquals(cands.items[0]!.externalId, '5001');
    assertEquals(cands.items[0]!.fullName, 'Manny Sample');

    const stages = await manatal.listStages('k', '701');
    stages.forEach(assertStage);
    assertEquals(stages[0]!.id, '11');

    const tags = await manatal.listTags('k');
    assertEquals(tags.length, 0);
  } finally {
    restore();
  }
});

Deno.test('manatal: single-page cursor returns the DRF next URL', async () => {
  const restore = installRouter([
    { match: 'status=open', body: manatalFx.jobsHasNext },
  ]);
  try {
    const reqs = await manatal.listRequisitions('k', '');
    assertEquals(
      reqs.nextCursor,
      'https://api.manatal.com/open/v3/jobs/?status=open&page=2',
    );
  } finally {
    restore();
  }
});

// ============================================================================
// Shared read dispatch (used by detect-new-candidates)
// ============================================================================
Deno.test('dispatch: listCandidatesForProvider routes to the provider client', async () => {
  const restore = installRouter([
    { match: '/applications', body: ghFx.applications },
    { match: '/candidates/', body: ghFx.candidate },
  ]);
  try {
    const page = await listCandidatesForProvider('greenhouse', 'k', {}, '101');
    assertEquals(page.items.length, 1);
    assertEquals(page.items[0]!.externalId, '7001');
  } finally {
    restore();
  }
});
