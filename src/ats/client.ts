// Thin facade between the UI and the ATS adapters.
//
// Today: dispatches every call to the locally-registered adapter. This is
// safe for the mock adapter (no network, no real credentials) and keeps the
// UI from knowing how the data was sourced.
//
// Phase 4+: for adapters whose authType is `oauth2` or `api_key`, this
// facade will instead call the `ats-proxy` Supabase edge function so OAuth
// tokens never live on the device. The UI surface here stays the same.

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

bootstrapAdapters();

export interface IntegrationRef {
  id: string;
  provider: ProviderId;
}

// Until pgsodium is wired up, mock integrations have no real credentials.
// Hand the adapter the minimum it needs to pass `testConnection`.
function credentialsFor(provider: ProviderId): StoredCredentials {
  if (provider === 'mock') return { apiKey: 'mock-key' };
  // Real providers go through ats-proxy in phase 4; the app never sees creds.
  return {};
}

export async function testConnection(integration: IntegrationRef): Promise<boolean> {
  const adapter = getAdapter(integration.provider);
  return adapter.testConnection(credentialsFor(integration.provider));
}

export async function listRequisitions(
  integration: IntegrationRef,
): Promise<Page<Requisition>> {
  const adapter = getAdapter(integration.provider);
  return adapter.listRequisitions(credentialsFor(integration.provider));
}

export async function listCandidates(
  integration: IntegrationRef,
  requisitionExternalId: string,
): Promise<Page<Candidate>> {
  const adapter = getAdapter(integration.provider);
  return adapter.listCandidatesForRequisition(
    credentialsFor(integration.provider),
    requisitionExternalId,
  );
}

export async function listStages(
  integration: IntegrationRef,
  requisitionExternalId: string,
): Promise<Stage[]> {
  const adapter = getAdapter(integration.provider);
  return adapter.listStages(credentialsFor(integration.provider), requisitionExternalId);
}

export async function listTags(integration: IntegrationRef): Promise<Tag[]> {
  const adapter = getAdapter(integration.provider);
  return adapter.listTags(credentialsFor(integration.provider));
}

export function capabilitiesFor(provider: ProviderId): AtsCapabilities {
  return getAdapter(provider).capabilities();
}
