// Candidate-filter server state. Global defaults ride on recruiter_profiles
// (app_prefs.candidate_filters, via the profile hooks); per-requisition
// overrides live in requisition_filters, written through the
// set_requisition_filters RPC.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/SessionProvider';
import { useRecruiterProfile } from '@/features/profile/queries';
import { getSupabase } from '@/lib/supabase';
import type { CandidateFilters } from './types';

const KEY = ['requisition-filters'] as const;

function reqFiltersKey(integrationId: string | undefined, reqId: string | undefined) {
  return [...KEY, integrationId ?? null, reqId ?? null] as const;
}

/** The recruiter's global filter defaults (app_prefs bucket). */
export function useGlobalCandidateFilters(): {
  filters: CandidateFilters | undefined;
  isLoading: boolean;
} {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  return {
    filters: profileQuery.data?.app_prefs?.candidate_filters,
    isLoading: profileQuery.isLoading,
  };
}

/** This requisition's override row, or null when inheriting the defaults. */
export function useRequisitionFilters(
  integrationId: string | undefined,
  requisitionExternalId: string | undefined,
) {
  return useQuery({
    queryKey: reqFiltersKey(integrationId, requisitionExternalId),
    enabled: Boolean(integrationId && requisitionExternalId),
    queryFn: async (): Promise<CandidateFilters | null> => {
      if (!integrationId || !requisitionExternalId) return null;
      const { data, error } = await getSupabase()
        .from('requisition_filters')
        .select('filters')
        .eq('integration_id', integrationId)
        .eq('requisition_external_id', requisitionExternalId)
        .maybeSingle();
      if (error) throw error;
      return (data?.filters as CandidateFilters | undefined) ?? null;
    },
  });
}

export interface SetRequisitionFiltersInput {
  integrationId: string;
  requisitionExternalId: string;
  /** null clears the override (back to inheriting the global defaults). */
  filters: CandidateFilters | null;
}

export function useSetRequisitionFilters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetRequisitionFiltersInput): Promise<void> => {
      const { error } = await getSupabase().rpc('set_requisition_filters', {
        p_integration_id: input.integrationId,
        p_requisition_external_id: input.requisitionExternalId,
        p_filters: input.filters,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({
        queryKey: reqFiltersKey(input.integrationId, input.requisitionExternalId),
      });
    },
  });
}
