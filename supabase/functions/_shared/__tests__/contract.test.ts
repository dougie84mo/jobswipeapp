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
import * as bamboohr from '../bamboohr.ts';
import * as smartrecruiters from '../smartrecruiters.ts';
import * as jazzhr from '../jazzhr.ts';
import * as icims from '../icims.ts';
import * as workday from '../workday.ts';
import { listCandidatesForProvider } from '../dispatch.ts';

import {
  ashby as ashbyFx,
  bamboohr as bamboohrFx,
  greenhouse as ghFx,
  icims as icimsFx,
  jazzhr as jazzhrFx,
  lever as leverFx,
  manatal as manatalFx,
  recruitee as recruiteeFx,
  smartrecruiters as srFx,
  teamtailor as ttFx,
  workable as workableFx,
  workday as workdayFx,
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
// BambooHR (Basic auth; numeric ids -> must stringify; candidate externalId IS
// the application id; reads + advance stage + add note)
// ============================================================================
Deno.test('bamboohr: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/applications', body: bamboohrFx.applications },
    { match: '/statuses', body: bamboohrFx.statuses },
    { match: '/jobs', body: bamboohrFx.jobs },
  ]);
  try {
    const reqs = await bamboohr.listRequisitions('acme', 'k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    // Numeric 801 -> '801'; the non-open job (802) is filtered out.
    assertEquals(reqs.items.length, 1);
    assertEquals(reqs.items[0]!.externalId, '801');

    const cands = await bamboohr.listCandidatesForRequisition(
      'acme',
      'k',
      '801',
    );
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    // externalId is the application id, not the applicant id.
    assertEquals(cands.items[0]!.externalId, '318');
    assertEquals(cands.items[0]!.requisitionExternalId, '801');
    assertEquals(cands.items[0]!.fullName, 'Bree Sample');

    const stages = await bamboohr.listStages('acme', 'k', '801');
    stages.forEach(assertStage);
    assertEquals(stages[0]!.id, '1');
    assertEquals(stages[0]!.name, 'New');

    // No tag vocabulary endpoint — listTags is intentionally empty.
    const tags = await bamboohr.listTags('acme', 'k');
    assertEquals(tags.length, 0);
  } finally {
    restore();
  }
});

Deno.test('bamboohr: single-page cursor returns the next page number', async () => {
  const restore = installRouter([
    { match: '/applications', body: bamboohrFx.applicationsHasNext },
  ]);
  try {
    const cands = await bamboohr.listCandidatesForRequisition(
      'acme',
      'k',
      '801',
      '', // '' -> first page only
    );
    assertPage(cands);
    assertEquals(cands.nextCursor, '2');
  } finally {
    restore();
  }
});

// ============================================================================
// SmartRecruiters (OAuth client-credentials; the token exchange is stubbed; the
// ListResult `content`/`nextPageId` envelope; stages are a fixed constant)
// ============================================================================
Deno.test('smartrecruiters: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/identity/oauth/token', body: srFx.token },
    { match: '/candidates', body: srFx.candidates },
    { match: '/jobs', body: srFx.jobs },
  ]);
  try {
    const reqs = await smartrecruiters.listRequisitions('cid', 'secret');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, 'job_sr1');
    assertEquals(reqs.items[0]!.department, 'Engineering');
    assertEquals(reqs.items[0]!.location, 'Berlin, de');

    const cands = await smartrecruiters.listCandidatesForRequisition(
      'cid',
      'secret',
      'job_sr1',
    );
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, 'cand_sr1');
    assertEquals(cands.items[0]!.requisitionExternalId, 'job_sr1');
    assertEquals(cands.items[0]!.fullName, 'Sven Sample');

    // Stages are a fixed constant (no API call, no token needed).
    const stages = await smartrecruiters.listStages();
    stages.forEach(assertStage);
    assertEquals(stages[0]!.id, 'LEAD');

    const tags = await smartrecruiters.listTags();
    assertEquals(tags.length, 0);
  } finally {
    restore();
  }
});

Deno.test('smartrecruiters: single-page cursor returns the nextPageId', async () => {
  const restore = installRouter([
    { match: '/identity/oauth/token', body: srFx.token },
    { match: '/jobs', body: srFx.jobsHasNext },
  ]);
  try {
    const reqs = await smartrecruiters.listRequisitions('cid', 'secret', '');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, 'PAGE_2');
  } finally {
    restore();
  }
});

// ============================================================================
// JazzHR (apikey query param; bare JSON arrays; read-only; open-job filter)
// ============================================================================
Deno.test('jazzhr: reads emit valid normalized shapes', async () => {
  const restore = installRouter([
    { match: '/applicants', body: jazzhrFx.applicants },
    { match: '/jobs', body: jazzhrFx.jobs },
  ]);
  try {
    const reqs = await jazzhr.listRequisitions('k');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    // The non-open (Filled) job is filtered out.
    assertEquals(reqs.items.length, 1);
    assertEquals(reqs.items[0]!.externalId, 'job_jz1');
    assertEquals(reqs.items[0]!.location, 'Austin, TX');

    const cands = await jazzhr.listCandidatesForRequisition('k', 'job_jz1');
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, 'app_jz1');
    assertEquals(cands.items[0]!.requisitionExternalId, 'job_jz1');
    assertEquals(cands.items[0]!.fullName, 'Jaz Sample');

    // Read-only: no stage/tag vocab endpoints.
    assertEquals((await jazzhr.listStages('k', 'job_jz1')).length, 0);
    assertEquals((await jazzhr.listTags('k')).length, 0);
  } finally {
    restore();
  }
});

Deno.test('jazzhr: single-page cursor returns null under a full page', async () => {
  const restore = installRouter([{ match: '/jobs', body: jazzhrFx.jobs }]);
  try {
    // The fixture is under the 100-row page size, so there's no next page.
    const reqs = await jazzhr.listRequisitions('k', '');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
  } finally {
    restore();
  }
});

// ============================================================================
// iCIMS + Workday — ⚠️ EXPERIMENTAL scaffolds (ready:false). These tests only
// prove our normalization is internally consistent against AUTHORED fixtures;
// they do NOT validate against real provider responses (see the client headers).
// ============================================================================
Deno.test('icims (experimental): reads normalize search-then-fetch', async () => {
  const restore = installRouter([
    { match: 'oauth/token', body: icimsFx.token },
    { match: '/search/jobs', body: icimsFx.jobsSearch },
    {
      match: '/search/applicantworkflows',
      body: icimsFx.applicantWorkflowsSearch,
    },
    { match: '/applicantworkflows/', body: icimsFx.applicantWorkflow },
    { match: '/jobs/', body: icimsFx.job },
  ]);
  try {
    const reqs = await icims.listRequisitions('cid', 'secret', 'cust1');
    assertPage(reqs);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, '90001'); // numeric -> string
    assertEquals(reqs.items[0]!.title, 'Data Engineer');

    const cands = await icims.listCandidatesForRequisition(
      'cid',
      'secret',
      'cust1',
      '90001',
    );
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, '70001');
    assertEquals(cands.items[0]!.fullName, 'Ida Sample');
  } finally {
    restore();
  }
});

Deno.test('workday (experimental): reads normalize the {data,total} envelope', async () => {
  const restore = installRouter([
    { match: 'oauth2/token', body: workdayFx.token },
    { match: '/candidates', body: workdayFx.candidates },
    { match: '/jobRequisitions', body: workdayFx.jobRequisitions },
  ]);
  try {
    const reqs = await workday.listRequisitions('cid', 'secret', 'acme');
    assertPage(reqs);
    assertEquals(reqs.nextCursor, null);
    reqs.items.forEach(assertRequisition);
    assertEquals(reqs.items[0]!.externalId, 'req_wd1');
    assertEquals(reqs.items[0]!.title, 'Software Engineer');

    const cands = await workday.listCandidatesForRequisition(
      'cid',
      'secret',
      'acme',
      'req_wd1',
    );
    assertPage(cands);
    cands.items.forEach(assertCandidate);
    assertEquals(cands.items[0]!.externalId, 'cand_wd1');
    assertEquals(cands.items[0]!.fullName, 'Wanda Sample');
  } finally {
    restore();
  }
});

Deno.test('workday (experimental): offset cursor advances while more remain', async () => {
  const restore = installRouter([
    { match: 'oauth2/token', body: workdayFx.token },
    { match: '/jobRequisitions', body: workdayFx.jobRequisitionsHasNext },
  ]);
  try {
    const reqs = await workday.listRequisitions('cid', 'secret', 'acme', '');
    assertEquals(reqs.nextCursor, '100'); // total 250 > offset+limit
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
