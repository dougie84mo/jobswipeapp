// Activity feed for an integration: list of past swipes with the
// candidate, requisition, and executed-action outcome denormalized inline.

import { useQuery } from '@tanstack/react-query';

import type { ExecutedAction, SwipeDirection } from '@/ats/types';
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
