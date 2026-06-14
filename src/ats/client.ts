// Thin facade between the UI and the ATS adapters.
//
// The mock provider runs in-process (no creds, no network). Every other
// provider routes through the ats-proxy Supabase edge function so OAuth
// tokens and API keys never live on the device. The UI surface is the same
// — testConnection / listRequisitions / listCandidates / listStages / listTags
// — and capabilitiesFor stays purely local because adapter.capabilities() is
// a pure function of the adapter shape, not credentials.

import { bootstrapAdapters } from './bootstrap';
import { getAdapter } from './registry';
import type {
  AddNoteInput,
  AddTagInput,
  AdvanceStageInput,
  AtsCapabilities,
  Candidate,
  Page,
  ProviderId,
  RejectInput,
  Requisition,
  Stage,
  StoredCredentials,
  Tag,
} from './types';
import { getSupabase } from '@/lib/supabase';

bootstrapAdapters();

export interface IntegrationRef {
  id: string;
  provider: ProviderId;
}

function usesProxy(provider: ProviderId): boolean {
  return provider !== 'mock';
}

async function invokeProxy<T>(
  integration: IntegrationRef,
  method: string,
  args?: object,
): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('ats-proxy', {
    body: {
      integrationId: integration.id,
      method,
      args: args ?? {},
    },
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || !('data' in data)) {
    throw new Error('ats-proxy returned an unexpected payload');
  }
  return (data as { data: T }).data;
}

// In-app mock execution path. Real providers never see these creds; the
// proxy does its own lookup against integrations.credentials_encrypted.
function mockCreds(provider: ProviderId): StoredCredentials {
  return provider === 'mock' ? { apiKey: 'mock-key' } : {};
}

export async function testConnection(integration: IntegrationRef): Promise<boolean> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<boolean>(integration, 'testConnection');
  }
  return getAdapter(integration.provider).testConnection(mockCreds(integration.provider));
}

// cursor semantics (threaded straight to the adapter / proxy):
//   undefined → auto-walk every page, nextCursor null (default; non-deck callers)
//   ''        → fetch the first page only, returning its real nextCursor
//   '<token>' → fetch the page identified by the opaque token
export async function listRequisitions(
  integration: IntegrationRef,
  cursor?: string,
): Promise<Page<Requisition>> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Page<Requisition>>(integration, 'listRequisitions', { cursor });
  }
  return getAdapter(integration.provider).listRequisitions(
    mockCreds(integration.provider),
    cursor,
  );
}

export async function listCandidates(
  integration: IntegrationRef,
  requisitionExternalId: string,
  cursor?: string,
): Promise<Page<Candidate>> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Page<Candidate>>(integration, 'listCandidatesForRequisition', {
      requisitionExternalId,
      cursor,
    });
  }
  return getAdapter(integration.provider).listCandidatesForRequisition(
    mockCreds(integration.provider),
    requisitionExternalId,
    cursor,
  );
}

export async function listStages(
  integration: IntegrationRef,
  requisitionExternalId: string,
): Promise<Stage[]> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Stage[]>(integration, 'listStages', { requisitionExternalId });
  }
  return getAdapter(integration.provider).listStages(
    mockCreds(integration.provider),
    requisitionExternalId,
  );
}

export async function listTags(integration: IntegrationRef): Promise<Tag[]> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Tag[]>(integration, 'listTags');
  }
  return getAdapter(integration.provider).listTags(mockCreds(integration.provider));
}

export function capabilitiesFor(provider: ProviderId): AtsCapabilities {
  return getAdapter(provider).capabilities();
}

// ============================================================================
// Writes
// ============================================================================

export async function advanceCandidateStage(
  integration: IntegrationRef,
  input: AdvanceStageInput,
): Promise<void> {
  if (usesProxy(integration.provider)) {
    await invokeProxy<unknown>(integration, 'advanceCandidateStage', input);
    return;
  }
  const adapter = getAdapter(integration.provider);
  if (!adapter.advanceCandidateStage) return;
  await adapter.advanceCandidateStage(mockCreds(integration.provider), input);
}

export async function rejectCandidate(
  integration: IntegrationRef,
  input: RejectInput,
): Promise<void> {
  if (usesProxy(integration.provider)) {
    await invokeProxy<unknown>(integration, 'rejectCandidate', input);
    return;
  }
  const adapter = getAdapter(integration.provider);
  if (!adapter.rejectCandidate) return;
  await adapter.rejectCandidate(mockCreds(integration.provider), input);
}

export async function addCandidateTag(
  integration: IntegrationRef,
  input: AddTagInput,
): Promise<void> {
  if (usesProxy(integration.provider)) {
    await invokeProxy<unknown>(integration, 'addCandidateTag', input);
    return;
  }
  const adapter = getAdapter(integration.provider);
  if (!adapter.addCandidateTag) return;
  await adapter.addCandidateTag(mockCreds(integration.provider), input);
}

export async function addCandidateNote(
  integration: IntegrationRef,
  input: AddNoteInput,
): Promise<void> {
  if (usesProxy(integration.provider)) {
    await invokeProxy<unknown>(integration, 'addCandidateNote', input);
    return;
  }
  const adapter = getAdapter(integration.provider);
  if (!adapter.addCandidateNote) return;
  await adapter.addCandidateNote(mockCreds(integration.provider), input);
}
