// integration_settings — the per-integration, per-direction action list
// that drives what happens in the ATS when the recruiter swipes.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ActionDescriptor, SwipeDirection } from '@/ats/types';
import { getSupabase } from '@/lib/supabase';

export interface IntegrationSettingsRow {
  id: string;
  integration_id: string;
  direction: SwipeDirection;
  actions: ActionDescriptor[];
}

function settingsKey(integrationId: string) {
  return ['integration-settings', integrationId] as const;
}

export function useIntegrationSettings(integrationId: string | undefined) {
  return useQuery({
    queryKey: settingsKey(integrationId ?? ''),
    enabled: Boolean(integrationId),
    queryFn: async (): Promise<IntegrationSettingsRow[]> => {
      if (!integrationId) return [];
      const { data, error } = await getSupabase()
        .from('integration_settings')
        .select('id, integration_id, direction, actions')
        .eq('integration_id', integrationId);
      if (error) throw error;
      return (data ?? []) as IntegrationSettingsRow[];
    },
  });
}

export interface UpsertSettingsInput {
  integrationId: string;
  direction: SwipeDirection;
  actions: ActionDescriptor[];
}

export function useUpsertIntegrationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertSettingsInput): Promise<void> => {
      const { error } = await getSupabase()
        .from('integration_settings')
        .upsert(
          {
            integration_id: input.integrationId,
            direction: input.direction,
            actions: input.actions,
          },
          { onConflict: 'integration_id,direction' },
        );
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: settingsKey(input.integrationId) });
    },
  });
}

export function actionsForDirection(
  rows: IntegrationSettingsRow[] | undefined,
  direction: SwipeDirection,
): ActionDescriptor[] {
  if (!rows) return [];
  return rows.find((r) => r.direction === direction)?.actions ?? [];
}
