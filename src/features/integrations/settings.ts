// integration_settings — the per-integration, per-direction action list
// that drives what happens in the ATS when the recruiter swipes.
//
// Since migration 0020 rows are per-member: unique on (integration_id,
// direction, user_id). On a team-shared connection RLS returns the caller's
// own rows plus the OWNER's rows (the team defaults); actionsForDirection
// resolves inheritance — your row for a direction wins, else the owner's.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ActionDescriptor, SwipeDirection } from '@/ats/types';
import { getSupabase } from '@/lib/supabase';

export interface IntegrationSettingsRow {
  id: string;
  integration_id: string;
  direction: SwipeDirection;
  actions: ActionDescriptor[];
  user_id: string;
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
        .select('id, integration_id, direction, actions, user_id')
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
  /** The signed-in user — rows are per-member since 0020. */
  userId: string;
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
            user_id: input.userId,
          },
          { onConflict: 'integration_id,direction,user_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: settingsKey(input.integrationId) });
    },
  });
}

/**
 * Resolve the action list for a direction with team inheritance: the
 * caller's own row wins; otherwise any other visible row for the direction
 * (RLS guarantees that can only be the connection owner's team default).
 */
export function actionsForDirection(
  rows: IntegrationSettingsRow[] | undefined,
  direction: SwipeDirection,
  userId: string | undefined,
): ActionDescriptor[] {
  if (!rows) return [];
  const forDirection = rows.filter((r) => r.direction === direction);
  const own = userId
    ? forDirection.find((r) => r.user_id === userId)
    : undefined;
  return (own ?? forDirection[0])?.actions ?? [];
}
