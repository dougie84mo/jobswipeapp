// Swipe-deck data: candidates pulled from the adapter (filtered against the
// recruiter's prior swipes for this requisition) and the recordSwipe mutation
// that persists each swipe to Postgres.

import { useCallback, useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { listCandidates } from '@/ats/client';
import type {
  Candidate,
  ExecutedAction,
  Page,
  Requisition,
  SwipeDirection,
} from '@/ats/types';
import { candidatePassesFilters, filtersKey } from '@/features/filters/predicate';
import type { CandidateFilters } from '@/features/filters/types';
import type { IntegrationRow } from '@/features/integrations/queries';
import { MATCHES_KEY } from '@/features/swipes/matches';
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
  /** Candidates dropped by the recruiter's filters across loaded pages. */
  filteredOutCount: number;
}

// A deck page plus how many candidates the preference filters removed from
// it (the already-swiped filter doesn't count — those aren't "hidden", they
// are done). Exported so the grading detail screen can scan cached pages.
export interface DeckPage extends Page<Candidate> {
  filteredOut: number;
}

export interface DeckOptions {
  /**
   * Keep already-swiped candidates in the deck (Grade mode shows everyone;
   * the swipe deck hides them). Part of the query key, so each mode caches
   * its own pages.
   */
  includeSwiped?: boolean;
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
  filters: CandidateFilters = {},
  options: DeckOptions = {},
): DeckResult {
  const includeSwiped = options.includeSwiped ?? false;
  const enabled = Boolean(integration && requisitionExternalId);
  const query = useInfiniteQuery({
    // filtersKey in the query key: editing filters mounts a fresh deck (the
    // screen resets its top index off the same key change).
    queryKey: [
      'deck',
      integration?.id ?? null,
      requisitionExternalId ?? null,
      filtersKey(filters),
      includeSwiped ? 'all' : 'unswiped',
    ],
    enabled,
    initialPageParam: '',
    queryFn: async ({ pageParam }): Promise<DeckPage> => {
      if (!integration || !requisitionExternalId) {
        return { items: [], nextCursor: null, filteredOut: 0 };
      }
      const [page, swiped] = await Promise.all([
        listCandidates(
          { id: integration.id, provider: integration.provider },
          requisitionExternalId,
          pageParam,
        ),
        includeSwiped
          ? Promise.resolve(new Set<string>())
          : fetchSwipedExternalIds(integration.id, requisitionExternalId),
      ]);
      const unswiped = page.items.filter((c) => !swiped.has(c.externalId));
      const items = unswiped.filter((c) => candidatePassesFilters(c, filters));
      return {
        items,
        nextCursor: page.nextCursor,
        filteredOut: unswiped.length - items.length,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // query.fetchNextPage is stable across renders in react-query v5; hoist it to
  // a local so this callback stays stable AND satisfies exhaustive-deps —
  // safe to depend on from the consumer's effect.
  const queryFetchNextPage = query.fetchNextPage;
  const fetchNextPage = useCallback(() => {
    void queryFetchNextPage();
  }, [queryFetchNextPage]);

  const pages = query.data?.pages ?? [];
  return {
    candidates: pages.flatMap((p) => p.items),
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    filteredOutCount: pages.reduce((acc, p) => acc + p.filteredOut, 0),
  };
}

/**
 * Find one candidate in the already-loaded deck pages (any filter / mode
 * variant of this requisition's deck). The grading detail screen is only
 * ever pushed from a loaded list, so a hit is effectively guaranteed; a
 * cold deep-link misses and the screen shows a go-back fallback. Reading
 * the cache avoids adding a getCandidate proxy round-trip.
 */
export function useCachedDeckCandidate(
  integrationId: string | undefined,
  requisitionExternalId: string | undefined,
  candidateExternalId: string | undefined,
): Candidate | undefined {
  const qc = useQueryClient();
  return useMemo(() => {
    if (!integrationId || !requisitionExternalId || !candidateExternalId) {
      return undefined;
    }
    const entries = qc.getQueriesData<InfiniteData<DeckPage>>({
      queryKey: ['deck', integrationId, requisitionExternalId],
    });
    for (const [, data] of entries) {
      for (const page of data?.pages ?? []) {
        const hit = page.items.find(
          (c) => c.externalId === candidateExternalId,
        );
        if (hit) return hit;
      }
    }
    return undefined;
  }, [qc, integrationId, requisitionExternalId, candidateExternalId]);
}

/**
 * The set of candidate external ids the caller has already swiped on this
 * requisition. Lives under swipedKey, which useRecordSwipe already
 * invalidates — Grade mode uses it for "Swiped" badges.
 */
export function useSwipedIds(
  integrationId: string | undefined,
  requisitionExternalId: string | undefined,
): Set<string> {
  const query = useQuery({
    queryKey: swipedKey(integrationId ?? '', requisitionExternalId ?? ''),
    enabled: Boolean(integrationId && requisitionExternalId),
    queryFn: () =>
      fetchSwipedExternalIds(integrationId ?? '', requisitionExternalId ?? ''),
  });
  return query.data ?? EMPTY_ID_SET;
}

const EMPTY_ID_SET: Set<string> = new Set();

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
        p_candidate_experience: input.candidate.experience ?? null,
        p_candidate_education: input.candidate.education ?? null,
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
      // Positive swipes surface on the Candidates tab.
      void qc.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}
