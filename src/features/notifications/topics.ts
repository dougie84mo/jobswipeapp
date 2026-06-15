// Per-requisition new-candidate notification opt-in. Reads the recruiter's
// enabled topics for an integration and toggles them via the
// set_notification_topic RPC. Actual delivery is handled server-side by the
// detect-new-candidates edge function (+ send-push); this is just the opt-in.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';

function topicsKey(integrationId: string | undefined) {
  return ['notification-topics', integrationId ?? null] as const;
}

// Returns the set of requisition_external_ids the recruiter has alerts on for
// this integration.
export function useNotificationTopics(integrationId: string | undefined) {
  return useQuery({
    queryKey: topicsKey(integrationId),
    enabled: Boolean(integrationId),
    queryFn: async (): Promise<Set<string>> => {
      if (!integrationId) return new Set();
      const { data, error } = await getSupabase()
        .from('notification_topics')
        .select('requisition_external_id, enabled')
        .eq('integration_id', integrationId);
      if (error) throw error;
      const rows = (data ?? []) as {
        requisition_external_id: string;
        enabled: boolean;
      }[];
      return new Set(
        rows.filter((r) => r.enabled).map((r) => r.requisition_external_id),
      );
    },
  });
}

export interface SetNotificationTopicInput {
  integrationId: string;
  requisitionExternalId: string;
  enabled: boolean;
}

export function useSetNotificationTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetNotificationTopicInput): Promise<void> => {
      const { error } = await getSupabase().rpc('set_notification_topic', {
        p_integration_id: input.integrationId,
        p_requisition_external_id: input.requisitionExternalId,
        p_enabled: input.enabled,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: topicsKey(input.integrationId) });
    },
  });
}
