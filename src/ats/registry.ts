import type { AtsAdapter, ProviderId } from './types';

/**
 * Adapter registry. Add a new ATS by importing its adapter and registering it
 * here — no other code in the app should need to change.
 */
const adapters = new Map<ProviderId, AtsAdapter>();

export function registerAdapter(adapter: AtsAdapter): void {
  adapters.set(adapter.providerId, adapter);
}

export function getAdapter(providerId: ProviderId): AtsAdapter {
  const adapter = adapters.get(providerId);
  if (!adapter) {
    throw new Error(`No adapter registered for provider "${providerId}"`);
  }
  return adapter;
}

export function listAdapters(): AtsAdapter[] {
  return Array.from(adapters.values());
}

export function hasAdapter(providerId: ProviderId): boolean {
  return adapters.has(providerId);
}
