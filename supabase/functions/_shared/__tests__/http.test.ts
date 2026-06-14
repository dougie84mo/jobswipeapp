// Unit tests for the shared HTTP plumbing (_shared/http.ts).
//
// Covers the rate-limit / retry contract every ATS client now inherits:
//   - 2xx returns immediately, no retry
//   - 429 retries, honoring Retry-After (seconds)
//   - retries are capped; on exhaustion the final response flows through
//   - non-2xx surfaces an HttpError carrying the real status, never the body
//   - 204 writes resolve to undefined
//
// Run: deno test --allow-all supabase/functions/_shared/__tests__/http.test.ts

import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import {
  callGet,
  callWrite,
  fetchWithBackoff,
  HttpError,
  MAX_RETRY_ATTEMPTS,
} from '../http.ts';

const realFetch = globalThis.fetch;
const realSetTimeout = globalThis.setTimeout;

interface FetchHarness {
  /** Status codes to return, in order; the last is reused once exhausted. */
  calls: number;
  delays: number[];
  restore: () => void;
}

// Replace fetch with a scripted sequence of responses and make setTimeout
// fire synchronously so retry sleeps don't slow the suite. Records the delays
// requested so we can assert Retry-After is honored.
function installFetch(responses: () => Response): FetchHarness {
  const harness: FetchHarness = {
    calls: 0,
    delays: [],
    restore: () => {
      globalThis.fetch = realFetch;
      globalThis.setTimeout = realSetTimeout;
    },
  };
  // deno-lint-ignore no-explicit-any
  globalThis.fetch = ((_url: any, _init?: any) => {
    harness.calls++;
    return Promise.resolve(responses());
  }) as typeof fetch;
  // deno-lint-ignore no-explicit-any
  globalThis.setTimeout = ((cb: (...a: any[]) => void, ms?: number) => {
    harness.delays.push(ms ?? 0);
    cb();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  return harness;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.test('fetchWithBackoff returns immediately on 2xx without retrying', async () => {
  const h = installFetch(() => jsonResponse({ ok: true }));
  try {
    const res = await fetchWithBackoff('https://x.test/a', { method: 'GET' });
    assertEquals(res.status, 200);
    assertEquals(h.calls, 1);
    assertEquals(h.delays.length, 0);
  } finally {
    h.restore();
  }
});

Deno.test('fetchWithBackoff retries on 429 then succeeds, honoring Retry-After', async () => {
  let n = 0;
  const h = installFetch(() => {
    n++;
    return n === 1
      ? new Response(null, { status: 429, headers: { 'Retry-After': '2' } })
      : jsonResponse({ ok: true });
  });
  try {
    const res = await fetchWithBackoff('https://x.test/a', { method: 'GET' });
    assertEquals(res.status, 200);
    assertEquals(h.calls, 2);
    // Retry-After: 2 seconds -> a single 2000ms sleep.
    assertEquals(h.delays, [2000]);
  } finally {
    h.restore();
  }
});

Deno.test('fetchWithBackoff caps retries and lets the final 429 flow through', async () => {
  const h = installFetch(() =>
    new Response(null, { status: 429, headers: { 'Retry-After': '1' } })
  );
  try {
    const res = await fetchWithBackoff(
      'https://x.test/a',
      { method: 'GET' },
      2,
    );
    assertEquals(res.status, 429);
    // 2 attempts inside the loop + 1 final pass-through fetch.
    assertEquals(h.calls, 3);
    assertEquals(h.delays.length, 2);
  } finally {
    h.restore();
  }
});

Deno.test('missing Retry-After defaults to a 1s sleep', async () => {
  let n = 0;
  const h = installFetch(() => {
    n++;
    return n === 1
      ? new Response(null, { status: 429 })
      : jsonResponse({ ok: true });
  });
  try {
    await fetchWithBackoff('https://x.test/a', { method: 'GET' });
    assertEquals(h.delays, [1000]);
  } finally {
    h.restore();
  }
});

Deno.test('MAX_RETRY_ATTEMPTS default is 3', () => {
  assertEquals(MAX_RETRY_ATTEMPTS, 3);
});

Deno.test('callGet parses JSON on success', async () => {
  const h = installFetch(() => jsonResponse({ hello: 'world' }));
  try {
    const out = await callGet<{ hello: string }>('https://x.test/a', {}, {
      provider: 'Test',
      route: '/a',
    });
    assertEquals(out.hello, 'world');
  } finally {
    h.restore();
  }
});

Deno.test('callGet throws HttpError carrying status, never the body', async () => {
  const h = installFetch(() =>
    // Body would leak PII in a real ATS 4xx — assert it never reaches the error.
    new Response(JSON.stringify({ email: 'leaked@example.com' }), {
      status: 422,
    })
  );
  try {
    const err = await assertRejects(
      () =>
        callGet('https://x.test/candidates/1', {}, {
          provider: 'Greenhouse',
          route: '/candidates/1',
        }),
      HttpError,
    );
    assertInstanceOf(err, HttpError);
    assertEquals(err.status, 422);
    assertEquals(err.provider, 'Greenhouse');
    assertStringIncludes(err.message, '422');
    assert(
      !err.message.includes('leaked@example.com'),
      'error message must not include the response body',
    );
    assert(
      !err.context.includes('leaked@example.com'),
      'error context must not include the response body',
    );
  } finally {
    h.restore();
  }
});

Deno.test('callWrite resolves to undefined on 204', async () => {
  const h = installFetch(() => new Response(null, { status: 204 }));
  try {
    const out = await callWrite('https://x.test/a', 'POST', {}, { x: 1 }, {
      provider: 'Test',
      route: '/a',
    });
    assertEquals(out, undefined);
  } finally {
    h.restore();
  }
});

Deno.test('callWrite includes the method in the error route', async () => {
  const h = installFetch(() => new Response(null, { status: 500 }));
  try {
    const err = await assertRejects(
      () =>
        callWrite('https://x.test/a', 'PATCH', {}, {}, {
          provider: 'Recruitee',
          route: '/a',
        }),
      HttpError,
    );
    assertInstanceOf(err, HttpError);
    assertStringIncludes(err.message, 'PATCH /a');
  } finally {
    h.restore();
  }
});
