// Swipe-deck data: candidates pulled from the adapter (filtered against the
// recruiter's prior swipes for this requisition) and the recordSwipe mutation
// that persists each swipe to Postgres.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listCandidates } from '@/ats/client';
import type {
  Candidate,
  ExecutedAction,
  Requisition,
  SwipeDirection,
} from '@/ats/types';
import type { IntegrationRow } from '@/features/integrations/queries';
import { getSupabase } from '@/lib/supabase';

function swipedKey(integrationId: string, requisitionExternalId: string) {
  return ['swipes', 'swiped', integrationId, requisitionExternalId] as const;
}

function candidatesKey(integrationId: string, requisitionExternalId: string) {
  return ['candidates', integrationId, requisitionExternalId] as const;
}

async function fetchSwipedExternalIds(
  integrationId: string,
  requisitionExternalId: string,
): Promise<Set<string>> {
  const { data, error } = await getSupabase().rpc(
    'list_swiped_candidate_external_ids',
    {
      p_integration_id: integrationId,
      p_requisition_external_id: requisitionExternalId,
    },
  );
  if (error) throw error;
  const rows = (data ?? []) as { external_id: string }[];
  return new Set(rows.map((r) => r.external_id));
}

export function useDeckCandidates(
  integration: IntegrationRow | null | undefined,
  requisitionExternalId: string | undefined,
) {
  const enabled = Boolean(integration && requisitionExternalId);
  return useQuery({
    queryKey: [
      'deck',
      integration?.id ?? null,
      requisitionExternalId ?? null,
    ],
    enabled,
    queryFn: async (): Promise<Candidate[]> => {
      if (!integration || !requisitionExternalId) return [];
      const [page, swiped] = await Promise.all([
        listCandidates(
          { id: integration.id, provider: integration.provider },
          requisitionExternalId,
        ),
        fetchSwipedExternalIds(integration.id, requisitionExternalId),
      ]);
      return page.items.filter((c) => !swiped.has(c.externalId));
    },
  });
}

export interface RecordSwipeInput {
  integration: IntegrationRow;
  requisition: Requisition;
  candidate: Candidate;
  direction: SwipeDirection;
  executedActions?: ExecutedAction[];
}

export function useRecordSwipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordSwipeInput): Promise<void> => {
      const { error } = await getSupabase().rpc('record_swipe', {
        p_integration_id: input.integration.id,
        p_requisition_external_id: input.requisition.externalId,
        p_requisition_title: input.requisition.title,
        p_requisition_department: input.requisition.department ?? null,
        p_requisition_location: input.requisition.location ?? null,
        p_requisition_raw: input.requisition.raw ?? null,
        p_candidate_external_id: input.candidate.externalId,
        p_candidate_full_name: input.candidate.fullName,
        p_candidate_headline: input.candidate.headline ?? null,
        p_candidate_location: input.candidate.location ?? null,
        p_candidate_resume_url: input.candidate.resumeUrl ?? null,
        p_candidate_photo_url: input.candidate.photoUrl ?? null,
        p_candidate_skills: input.candidate.skills ?? null,
        p_candidate_years_experience: input.candidate.yearsExperience ?? null,
        p_candidate_raw: input.candidate.raw ?? null,
        p_direction: input.direction,
        p_executed_actions: input.executedActions ?? [],
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: swipedKey(input.integration.id, input.requisition.externalId),
      });
      void qc.invalidateQueries({
        queryKey: candidatesKey(input.integration.id, input.requisition.externalId),
      });
    },
  });
}
