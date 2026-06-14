// Shared HTTP plumbing for the Deno ATS clients.
//
// Every provider client (greenhouse / ashby / lever / workable / recruitee, and
// future ones) used to carry its own copy of: the 429/Retry-After backoff loop,
// a GET helper, a POST/PUT/PATCH helper, the Basic/Bearer auth-header builder,
// and the error-message format. They were identical modulo the provider name.
// This module is the single home for all of it so rate-limit, retry, and error
// behavior stay uniform and are fixed in one place.
//
// Per-provider walks (cursor vs offset vs page-number pagination) stay in each
// client — only the per-request primitives live here.
//
// PII / credential safety: thrown errors NEVER include the response body. ATS
// error bodies routinely echo candidate names, emails, or fragments of the
// submitted payload; surfacing them would leak PII into proxy logs and into the
// error string the app renders. HttpError carries only provider + route +
// status, which is enough to diagnose without leaking anything sensitive.

/** Default cap on 429 retry attempts before the final response flows through. */
export const MAX_RETRY_ATTEMPTS = 3;
/** Default cap on auto-walked pages so a runaway pipeline can't loop forever. */
export const MAX_PAGES = 10;
/** Default page size requested from providers that take one. */
export const PER_PAGE = 100;

/** HTTP Basic with the API key as username and empty password (`${key}:`). */
export function authHeaderBasic(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

/** HTTP Bearer token. */
export function authHeaderBearer(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Error thrown when an upstream ATS returns a non-2xx response. Carries the
 * real upstream `status` so the proxy can surface it, plus a redacted `context`
 * (`provider` + `route`) — deliberately no response body (see file header).
 */
export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly provider: string;
  readonly route: string;

  constructor(
    provider: string,
    route: string,
    status: number,
    statusText: string,
  ) {
    super(`${provider} ${status} ${statusText} for ${route}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.provider = provider;
    this.route = route;
  }

  /** Greppable, PII-free one-liner for structured logs. */
  get context(): string {
    return `${this.provider} ${this.status} for ${this.route}`;
  }
}

export interface CallCtx {
  /** Provider display name used in error messages, e.g. 'Greenhouse'. */
  provider: string;
  /** Request path (or absolute URL) used in error messages — no secrets. */
  route: string;
  /** Override the default retry cap for this call. */
  maxRetries?: number;
}

/**
 * fetch() wrapped in 429/Retry-After backoff. Honors the server-advised
 * Retry-After (seconds, default 1s), retries up to `maxRetries`, draining each
 * 429 body so the connection can be reused. On exhaustion the final attempt's
 * response flows through unmodified so the caller surfaces the real status.
 */
export async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  maxRetries: number = MAX_RETRY_ATTEMPTS,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get('Retry-After')) || 1;
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
  }
  return fetch(url, init);
}

/** Throw an HttpError on a non-ok response, draining the body first. */
async function ensureOk(
  res: Response,
  provider: string,
  route: string,
): Promise<void> {
  if (res.ok) return;
  // Drain (don't read) the body: it can contain PII, and cancelling frees the
  // connection. The status alone drives both diagnosis and retry decisions.
  await res.body?.cancel();
  throw new HttpError(provider, route, res.status, res.statusText);
}

/** GET `url` with `headers`, parse JSON, throw HttpError on non-2xx. */
export async function callGet<T>(
  url: string,
  headers: Record<string, string>,
  ctx: CallCtx,
): Promise<T> {
  const res = await fetchWithBackoff(
    url,
    { method: 'GET', headers },
    ctx.maxRetries,
  );
  await ensureOk(res, ctx.provider, ctx.route);
  return (await res.json()) as T;
}

/**
 * Write to `url` with `method`/`headers`/`body`, parse JSON (or `undefined` on
 * 204), throw HttpError on non-2xx. `body === undefined` sends no body.
 */
export async function callWrite<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  headers: Record<string, string>,
  body: unknown,
  ctx: CallCtx,
): Promise<T> {
  const res = await fetchWithBackoff(
    url,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    ctx.maxRetries,
  );
  // Mirror the old per-client format (`Provider <status> ... for POST /path`).
  await ensureOk(res, ctx.provider, `${method} ${ctx.route}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
