// Activity feed for an integration: list of past swipes with the
// candidate, requisition, and executed-action outcome denormalized inline.
// Also owns the per-action retry mutation that re-runs a failed step.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ActionDescriptor,
  Candidate,
  ExecutedAction,
  ProviderId,
  SwipeDirection,
} from '@/ats/types';
import { executeActions } from '@/features/swipes/execute-actions';
import { getSupabase } from '@/lib/supabase';

export interface ActivityRow {
  swipe_id: string;
  direction: SwipeDirection;
  executed_actions: ExecutedAction[];
  created_at: string;
  candidate_external_id: string;
  candidate_full_name: string;
  candidate_photo_url: string | null;
  candidate_headline: string | null;
  requisition_external_id: string;
  requisition_title: string;
}

export function useActivity(integrationId: string | undefined) {
  return useQuery({
    queryKey: ['activity', integrationId],
    enabled: Boolean(integrationId),
    queryFn: async (): Promise<ActivityRow[]> => {
      if (!integrationId) return [];
      const { data, error } = await getSupabase().rpc(
        'list_activity_for_integration',
        { p_integration_id: integrationId },
      );
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
}

export interface RetryActionInput {
  integrationId: string;
  provider: ProviderId;
  row: ActivityRow;
  actionIndex: number;
}

// Re-runs the action at row.executed_actions[actionIndex] through the
// executor (which routes to the proxy for non-mock providers) and writes
// the new ExecutedAction back into the array via the
// set_swipe_executed_actions RPC.
export function useRetryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RetryActionInput): Promise<void> => {
      const original = input.row.executed_actions[input.actionIndex];
      if (!original) throw new Error('retry: action no longer exists on the swipe');

      const candidate: Candidate = {
        externalId: input.row.candidate_external_id,
        requisitionExternalId: input.row.requisition_external_id,
        fullName: input.row.candidate_full_name,
        headline: input.row.candidate_headline ?? undefined,
        photoUrl: input.row.candidate_photo_url ?? undefined,
        raw: null,
      };
      const action: ActionDescriptor = original.descriptor;

      const [result] = await executeActions(
        { id: input.integrationId, provider: input.provider },
        input.row.requisition_external_id,
        candidate,
        [action],
      );
      if (!result) throw new Error('retry: executor returned no result');

      const nextExecutedActions = input.row.executed_actions.map((entry, i) =>
        i === input.actionIndex ? result : entry,
      );

      const { error } = await getSupabase().rpc('set_swipe_executed_actions', {
        p_swipe_id: input.row.swipe_id,
        p_executed_actions: nextExecutedActions,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['activity', input.integrationId] });
    },
  });
}
