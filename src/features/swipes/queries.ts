// Swipe-deck data: candidates pulled from the adapter (filtered against the
// recruiter's prior swipes for this requisition) and the recordSwipe mutation
// that persists each swipe to Postgres.

import { useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { listCandidates } from '@/ats/client';
import type {
  Candidate,
  ExecutedAction,
  Page,
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

export interface DeckResult {
  candidates: Candidate[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

// Candidates for the swipe deck, paged on demand. Each page is fetched with an
// opaque cursor ('' for the first page, then page.nextCursor), so decks deeper
// than the client's MAX_PAGES auto-walk cap are reachable.
//
// Swiped candidates are filtered out at fetch time, per page. The deck query
// key is intentionally NOT invalidated when a swipe is recorded, so already
// loaded pages stay stable and the consumer can advance a simple top index
// without the list reshuffling under it.
export function useDeckCandidates(
  integration: IntegrationRow | null | undefined,
  requisitionExternalId: string | undefined,
): DeckResult {
  const enabled = Boolean(integration && requisitionExternalId);
  const query = useInfiniteQuery({
    queryKey: ['deck', integration?.id ?? null, requisitionExternalId ?? null],
    enabled,
    initialPageParam: '',
    queryFn: async ({ pageParam }): Promise<Page<Candidate>> => {
      if (!integration || !requisitionExternalId) {
        return { items: [], nextCursor: null };
      }
      const [page, swiped] = await Promise.all([
        listCandidates(
          { id: integration.id, provider: integration.provider },
          requisitionExternalId,
          pageParam,
        ),
        fetchSwipedExternalIds(integration.id, requisitionExternalId),
      ]);
      return {
        items: page.items.filter((c) => !swiped.has(c.externalId)),
        nextCursor: page.nextCursor,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // query.fetchNextPage is stable across renders in react-query v5, so this
  // callback is stable too — safe to depend on from the consumer's effect.
  const fetchNextPage = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);

  return {
    candidates: (query.data?.pages ?? []).flatMap((p) => p.items),
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
  };
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
