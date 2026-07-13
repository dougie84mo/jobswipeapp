import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { type AdminApiDeps, makeHandler } from '../handler.ts';

function post(body: unknown): Request {
  return new Request('http://localhost/admin-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-jwt',
    },
    body: JSON.stringify(body),
  });
}

function deps(overrides: Partial<AdminApiDeps> = {}): AdminApiDeps {
  return {
    getEmail: () => Promise.resolve('admin@example.test'),
    isAdmin: () => Promise.resolve(true),
    actions: { ping: (params) => Promise.resolve({ ok: true, params }) },
    ...overrides,
  };
}

Deno.test('admin-api: OPTIONS preflight returns 204', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', { method: 'OPTIONS' }),
  );
  assertEquals(res.status, 204);
});

Deno.test('admin-api: non-POST returns 405', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', { method: 'GET' }),
  );
  assertEquals(res.status, 405);
  await res.body?.cancel();
});

Deno.test('admin-api: 401 when the JWT resolves to no email', async () => {
  const handler = makeHandler(deps({ getEmail: () => Promise.resolve(null) }));
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'invalid token' });
});

Deno.test('admin-api: 403 when the email is not allowlisted', async () => {
  const handler = makeHandler(deps({ isAdmin: () => Promise.resolve(false) }));
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 403);
  assertEquals(await res.json(), { error: 'not an admin' });
});

Deno.test('admin-api: 400 on invalid JSON body', async () => {
  const handler = makeHandler(deps());
  const res = await handler(
    new Request('http://localhost/admin-api', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-jwt' },
      body: 'not json',
    }),
  );
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test('admin-api: 400 on unknown action', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'drop_tables' }));
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'unknown action drop_tables' });
});

Deno.test('admin-api: dispatches to the action and returns its result', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'ping', params: { a: 1 } }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, params: { a: 1 } });
});

Deno.test('admin-api: params defaults to {} when omitted', async () => {
  const handler = makeHandler(deps());
  const res = await handler(post({ action: 'ping' }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, params: {} });
});

Deno.test('admin-api: 500 hides internal error details', async () => {
  const handler = makeHandler(deps({
    actions: {
      boom: () => Promise.reject(new Error('secret internal detail')),
    },
  }));
  const res = await handler(post({ action: 'boom' }));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'internal error' });
});
