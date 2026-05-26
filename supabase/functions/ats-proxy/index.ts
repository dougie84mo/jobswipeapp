// Edge function: ats-proxy
//
// The mobile app calls this for every operation against a real ATS so OAuth
// tokens and API keys never live on the device. The Authorization header
// carries the recruiter's JWT; we use it to authenticate against the same
// Postgres RLS the app sees, look up the integrations row, decode credentials,
// dispatch to the right per-provider client, and return normalized data.
//
// Today only Greenhouse is implemented for reads (testConnection,
// listRequisitions, listCandidatesForRequisition, listStages, listTags).
// Writes (advance_stage / reject / add_note / apply_tag) require Greenhouse's
// On-Behalf-Of header pointing at a Greenhouse user id, which we don't
// capture yet — added in a follow-up alongside on_behalf_of_user_id on the
// integrations row.
//
// Credentials are currently stored as plain UTF-8 bytea by create_integration
// (see 0002_integration_rpc.sql). pgsodium / Supabase Vault encryption is the
// next migration; decodeCredentialsToApiKey() is the seam where the decrypt
// call slots in.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

import {
  listCandidatesForRequisition as ghListCandidates,
  listRequisitions as ghListRequisitions,
  listStages as ghListStages,
  listTags as ghListTags,
  testConnection as ghTestConnection,
} from '../_shared/greenhouse.ts';

type Method =
  | 'testConnection'
  | 'listRequisitions'
  | 'listCandidatesForRequisition'
  | 'listStages'
  | 'listTags';

interface RequestBody {
  integrationId: string;
  method: Method;
  args?: Record<string, unknown>;
}

interface IntegrationRow {
  id: string;
  user_id: string;
  provider: string;
  credentials_encrypted: string; // bytea exposed as base64 by PostgREST
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// create_integration writes UTF-8 bytes of the cleartext credential into
// credentials_encrypted. PostgREST exposes that bytea as a base64 string with
// no \x prefix. Decode → UTF-8 string. Phase 4b swaps this for pgsodium.
function decodeCredentialsToApiKey(bytea: string): string {
  try {
    const cleaned = bytea.startsWith('\\x')
      // Hex format fallback (some older PostgREST configs).
      ? hexToString(bytea.slice(2))
      : new TextDecoder().decode(
          Uint8Array.from(atob(bytea), (c) => c.charCodeAt(0)),
        );
    return cleaned;
  } catch {
    return '';
  }
}

function hexToString(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return jsonResponse({ error: 'missing Authorization header' }, 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }
  if (!body?.integrationId || !body?.method) {
    return jsonResponse({ error: 'integrationId and method are required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'edge function not configured' }, 500);
  }

  // Use the caller's JWT so RLS scopes the integrations row lookup to them.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: integrationRaw, error: lookupError } = await supabase
    .from('integrations')
    .select('id, user_id, provider, credentials_encrypted')
    .eq('id', body.integrationId)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: `integration lookup failed: ${lookupError.message}` }, 500);
  }
  const integration = integrationRaw as IntegrationRow | null;
  if (!integration) {
    return jsonResponse({ error: 'integration not found' }, 404);
  }

  const apiKey = decodeCredentialsToApiKey(integration.credentials_encrypted);
  if (!apiKey) {
    return jsonResponse({ error: 'integration credentials are empty' }, 400);
  }

  try {
    const result = await dispatch(integration.provider, body.method, apiKey, body.args ?? {});
    return jsonResponse({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 502);
  }
});

async function dispatch(
  provider: string,
  method: Method,
  apiKey: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (provider === 'greenhouse') {
    switch (method) {
      case 'testConnection':
        return ghTestConnection(apiKey);
      case 'listRequisitions':
        return ghListRequisitions(apiKey);
      case 'listCandidatesForRequisition': {
        const reqId = args.requisitionExternalId as string | undefined;
        if (!reqId) throw new Error('requisitionExternalId required');
        return ghListCandidates(apiKey, reqId);
      }
      case 'listStages': {
        const reqId = args.requisitionExternalId as string | undefined;
        if (!reqId) throw new Error('requisitionExternalId required');
        return ghListStages(apiKey, reqId);
      }
      case 'listTags':
        return ghListTags(apiKey);
    }
  }
  throw new Error(`ats-proxy: unsupported provider "${provider}" or method "${method}"`);
}
