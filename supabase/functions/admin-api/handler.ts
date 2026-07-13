// admin-api request pipeline: CORS -> JWT email -> allowlist -> dispatch.
//
// Dependency-injected (AdminApiDeps) so the gate and dispatch are unit-testable
// without network; index.ts wires the real Supabase-backed implementations.

export interface AdminApiDeps {
  /** Resolve the caller's email from the request's JWT; null = invalid. */
  getEmail: (req: Request) => Promise<string | null>;
  /** True when the (lower-cased) email is in admin_users. */
  isAdmin: (email: string) => Promise<boolean>;
  /** Action name -> implementation. All phase-1 actions are read-only. */
  actions: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown>
  >;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function makeHandler(
  deps: AdminApiDeps,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method not allowed' }, 405);
    }

    let email: string | null;
    try {
      email = await deps.getEmail(req);
      if (!email) {
        return jsonResponse({ error: 'invalid token' }, 401);
      }
      if (!(await deps.isAdmin(email))) {
        return jsonResponse({ error: 'not an admin' }, 403);
      }
    } catch (err) {
      console.error('admin-api gate failed:', err);
      return jsonResponse({ error: 'internal error' }, 500);
    }

    let body: { action?: unknown; params?: unknown };
    try {
      body = (await req.json()) as { action?: unknown; params?: unknown };
    } catch {
      return jsonResponse({ error: 'invalid JSON body' }, 400);
    }

    const actionName = typeof body.action === 'string' ? body.action : '';
    const action = deps.actions[actionName];
    if (!action) {
      return jsonResponse({ error: `unknown action ${actionName}` }, 400);
    }

    const params = (typeof body.params === 'object' && body.params !== null)
      ? (body.params as Record<string, unknown>)
      : {};

    try {
      return jsonResponse(await action(params));
    } catch (err) {
      // Never echo internals to the client — logs only (same rule as billing).
      console.error(`admin-api ${actionName} failed:`, err);
      return jsonResponse({ error: 'internal error' }, 500);
    }
  };
}
