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
import {
  addCandidateTag as ashbyAddTag,
  changeStage as ashbyChangeStage,
  createCandidateNote as ashbyCreateNote,
  listCandidatesForRequisition as ashbyListCandidates,
  listRequisitions as ashbyListRequisitions,
  listStages as ashbyListStages,
  listTags as ashbyListTags,
  testConnection as ashbyTestConnection,
} from '../_shared/ashby.ts';
import {
  addOpportunityNote as leverAddNote,
  addOpportunityTag as leverAddTag,
  archiveOpportunity as leverArchive,
  changeStage as leverChangeStage,
  listCandidatesForRequisition as leverListCandidates,
  listRequisitions as leverListRequisitions,
  listStages as leverListStages,
  listTags as leverListTags,
  testConnection as leverTestConnection,
} from '../_shared/lever.ts';
import {
  addCandidateComment as workableAddComment,
  disqualifyCandidate as workableDisqualify,
  listCandidatesForRequisition as workableListCandidates,
  listRequisitions as workableListRequisitions,
  listStages as workableListStages,
  listTags as workableListTags,
  moveStage as workableMoveStage,
  setCandidateTags as workableSetTags,
  testConnection as workableTestConnection,
} from '../_shared/workable.ts';

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
  extras: Record<string, unknown> | null;
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
    .select('id, user_id, provider, on_behalf_of_user_id, extras')
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

  if (
    WRITE_METHODS.has(body.method) &&
    providerRequiresOnBehalfOf(integration.provider) &&
    !integration.on_behalf_of_user_id
  ) {
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
      integration.extras ?? {},
      body.args ?? {},
    );
    return jsonResponse({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 502);
  }
});

function providerRequiresOnBehalfOf(provider: string): boolean {
  // Greenhouse attributes every write to a Greenhouse user via On-Behalf-Of.
  // Ashby's API key is the actor, so no separate user id is needed.
  return provider === 'greenhouse';
}

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
  extras: Record<string, unknown>,
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
  if (provider === 'ashby') {
    switch (method) {
      case 'testConnection':
        return ashbyTestConnection(apiKey);
      case 'listRequisitions':
        return ashbyListRequisitions(apiKey);
      case 'listCandidatesForRequisition':
        return ashbyListCandidates(apiKey, str(args, 'requisitionExternalId'));
      case 'listStages':
        return ashbyListStages(apiKey, str(args, 'requisitionExternalId'));
      case 'listTags':
        return ashbyListTags(apiKey);
      case 'advanceCandidateStage':
        return ashbyChangeStage(
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'requisitionExternalId'),
          str(args, 'stageId'),
        );
      case 'rejectCandidate':
        // Ashby's archive flow is provider-specific and isn't wired yet —
        // surface as a clean failure so the executor logs it and moves on
        // rather than silently skipping it as a capability gap.
        throw new Error('Ashby reject is not implemented yet');
      case 'addCandidateTag':
        return ashbyAddTag(
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'tagId'),
        );
      case 'addCandidateNote':
        return ashbyCreateNote(
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'text'),
        );
    }
  }
  if (provider === 'lever') {
    switch (method) {
      case 'testConnection':
        return leverTestConnection(apiKey);
      case 'listRequisitions':
        return leverListRequisitions(apiKey);
      case 'listCandidatesForRequisition':
        return leverListCandidates(apiKey, str(args, 'requisitionExternalId'));
      case 'listStages':
        return leverListStages(apiKey, str(args, 'requisitionExternalId'));
      case 'listTags':
        return leverListTags(apiKey);
      case 'advanceCandidateStage':
        return leverChangeStage(
          apiKey,
          // Lever's externalId IS the opportunity id; no application lookup
          // needed unlike Greenhouse / Ashby.
          str(args, 'candidateExternalId'),
          str(args, 'stageId'),
        );
      case 'rejectCandidate':
        return leverArchive(
          apiKey,
          str(args, 'candidateExternalId'),
          strOpt(args, 'reasonId'),
        );
      case 'addCandidateTag':
        return leverAddTag(
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'tagId'),
        );
      case 'addCandidateNote':
        return leverAddNote(
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'text'),
        );
    }
  }
  if (provider === 'workable') {
    const subdomain = typeof extras.subdomain === 'string' ? extras.subdomain : '';
    if (!subdomain) {
      throw new Error(
        'Workable integration is missing extras.subdomain. Reconnect and supply your Workable account subdomain.',
      );
    }
    switch (method) {
      case 'testConnection':
        return workableTestConnection(subdomain, apiKey);
      case 'listRequisitions':
        return workableListRequisitions(subdomain, apiKey);
      case 'listCandidatesForRequisition':
        return workableListCandidates(
          subdomain,
          apiKey,
          str(args, 'requisitionExternalId'),
        );
      case 'listStages':
        return workableListStages(
          subdomain,
          apiKey,
          str(args, 'requisitionExternalId'),
        );
      case 'listTags':
        return workableListTags(subdomain, apiKey);
      case 'advanceCandidateStage':
        return workableMoveStage(
          subdomain,
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'stageId'),
        );
      case 'rejectCandidate':
        return workableDisqualify(
          subdomain,
          apiKey,
          str(args, 'candidateExternalId'),
          strOpt(args, 'reasonId'),
        );
      case 'addCandidateTag':
        return workableSetTags(
          subdomain,
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'tagId'),
        );
      case 'addCandidateNote':
        return workableAddComment(
          subdomain,
          apiKey,
          str(args, 'candidateExternalId'),
          str(args, 'text'),
        );
    }
  }
  throw new Error(`ats-proxy: unsupported provider "${provider}" or method "${method}"`);
}
