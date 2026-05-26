// Edge function: ats-proxy
//
// The mobile app calls this for every operation against a real ATS so OAuth
// tokens and API keys never live on the device. The Authorization header
// carries the recruiter's JWT; we use it to authenticate against the same
// Postgres RLS the app sees, look up the integrations row, decrypt
// credentials, dispatch to the right per-provider client, and return
// normalized data.
//
// Greenhouse: full coverage. Reads (testConnection, listRequisitions,
// listCandidatesForRequisition, listStages, listTags) plus writes
// (advanceStage, reject, addNote, applyTag). Writes need On-Behalf-Of —
// stored on integrations.on_behalf_of_user_id (migration 0007). A write
// against an integration with no on_behalf_of_user_id fails fast with a
// clear message rather than silently posting as the wrong user.
//
// Credentials are encrypted at rest in vault.secrets (migration
// 0006_vault_credentials.sql). The only chokepoint that returns plaintext
// is the read_integration_credentials SECURITY DEFINER RPC, which verifies
// the caller owns the integration before reading vault.decrypted_secrets.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

import {
  addCandidateNote as ghAddNote,
  advanceStage as ghAdvanceStage,
  applyCandidateTag as ghApplyTag,
  listCandidatesForRequisition as ghListCandidates,
  listRequisitions as ghListRequisitions,
  listStages as ghListStages,
  listTags as ghListTags,
  rejectApplication as ghReject,
  testConnection as ghTestConnection,
} from '../_shared/greenhouse.ts';

type Method =
  | 'testConnection'
  | 'listRequisitions'
  | 'listCandidatesForRequisition'
  | 'listStages'
  | 'listTags'
  | 'advanceCandidateStage'
  | 'rejectCandidate'
  | 'addCandidateTag'
  | 'addCandidateNote';

const WRITE_METHODS: Set<Method> = new Set([
  'advanceCandidateStage',
  'rejectCandidate',
  'addCandidateTag',
  'addCandidateNote',
]);

interface RequestBody {
  integrationId: string;
  method: Method;
  args?: Record<string, unknown>;
}

interface IntegrationRow {
  id: string;
  user_id: string;
  provider: string;
  on_behalf_of_user_id: string | null;
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

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: integrationRaw, error: lookupError } = await supabase
    .from('integrations')
    .select('id, user_id, provider, on_behalf_of_user_id')
    .eq('id', body.integrationId)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: `integration lookup failed: ${lookupError.message}` }, 500);
  }
  const integration = integrationRaw as IntegrationRow | null;
  if (!integration) {
    return jsonResponse({ error: 'integration not found' }, 404);
  }

  const { data: apiKey, error: credsError } = await supabase.rpc(
    'read_integration_credentials',
    { p_integration_id: body.integrationId },
  );
  if (credsError) {
    return jsonResponse({ error: `credentials read failed: ${credsError.message}` }, 500);
  }
  if (!apiKey || typeof apiKey !== 'string') {
    return jsonResponse({ error: 'integration credentials are empty' }, 400);
  }

  if (WRITE_METHODS.has(body.method) && !integration.on_behalf_of_user_id) {
    return jsonResponse(
      {
        error:
          'Write actions require on_behalf_of_user_id on the integration. Set your Greenhouse user id when connecting.',
      },
      400,
    );
  }

  try {
    const result = await dispatch(
      integration.provider,
      body.method,
      apiKey,
      integration.on_behalf_of_user_id,
      body.args ?? {},
    );
    return jsonResponse({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 502);
  }
});

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`ats-proxy: arg "${key}" is required`);
  }
  return v;
}

function strOpt(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

async function dispatch(
  provider: string,
  method: Method,
  apiKey: string,
  onBehalfOf: string | null,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (provider === 'greenhouse') {
    switch (method) {
      case 'testConnection':
        return ghTestConnection(apiKey);
      case 'listRequisitions':
        return ghListRequisitions(apiKey);
      case 'listCandidatesForRequisition':
        return ghListCandidates(apiKey, str(args, 'requisitionExternalId'));
      case 'listStages':
        return ghListStages(apiKey, str(args, 'requisitionExternalId'));
      case 'listTags':
        return ghListTags(apiKey);
      case 'advanceCandidateStage':
        return ghAdvanceStage(
          apiKey,
          onBehalfOf!,
          str(args, 'candidateExternalId'),
          str(args, 'requisitionExternalId'),
          str(args, 'stageId'),
        );
      case 'rejectCandidate':
        return ghReject(
          apiKey,
          onBehalfOf!,
          str(args, 'candidateExternalId'),
          str(args, 'requisitionExternalId'),
          strOpt(args, 'reasonId'),
        );
      case 'addCandidateTag':
        return ghApplyTag(
          apiKey,
          onBehalfOf!,
          str(args, 'candidateExternalId'),
          str(args, 'tagId'),
        );
      case 'addCandidateNote':
        return ghAddNote(
          apiKey,
          onBehalfOf!,
          str(args, 'candidateExternalId'),
          str(args, 'text'),
        );
    }
  }
  throw new Error(`ats-proxy: unsupported provider "${provider}" or method "${method}"`);
}
