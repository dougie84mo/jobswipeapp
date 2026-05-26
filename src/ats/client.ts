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
  AtsCapabilities,
  Candidate,
  Page,
  ProviderId,
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
  args?: Record<string, unknown>,
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

export async function listRequisitions(
  integration: IntegrationRef,
): Promise<Page<Requisition>> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Page<Requisition>>(integration, 'listRequisitions');
  }
  return getAdapter(integration.provider).listRequisitions(mockCreds(integration.provider));
}

export async function listCandidates(
  integration: IntegrationRef,
  requisitionExternalId: string,
): Promise<Page<Candidate>> {
  if (usesProxy(integration.provider)) {
    return invokeProxy<Page<Candidate>>(integration, 'listCandidatesForRequisition', {
      requisitionExternalId,
    });
  }
  return getAdapter(integration.provider).listCandidatesForRequisition(
    mockCreds(integration.provider),
    requisitionExternalId,
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
