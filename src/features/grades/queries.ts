// Candidate-grade server state. Written through the set_candidate_grade RPC
// (full replace; all-empty deletes). The mutation is optimistic because
// grades are edited rapidly while scrolling the Grade list — a refetch per
// keystroke would flicker.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/SessionProvider';
import { getSupabase } from '@/lib/supabase';
import { isEmptyGrade, type GradeValues } from './grade-utils';
import type { CandidateGradeRow } from './types';

const GRADES_KEY = ['candidate-grades'] as const;

function reqGradesKey(
  integrationId: string | undefined,
  requisitionExternalId: string | undefined,
) {
  return [...GRADES_KEY, 'req', integrationId ?? null, requisitionExternalId ?? null] as const;
}

const VISIBLE_GRADES_KEY = [...GRADES_KEY, 'visible'] as const;

function useUserId(): string | undefined {
  const session = useSession();
  return session.status === 'ready' && session.session
    ? session.session.user.id
    : undefined;
}

/** The caller's OWN grade rows for one requisition, keyed by candidate. */
export function useCandidateGrades(
  integrationId: string | undefined,
  requisitionExternalId: string | undefined,
): {
  byCandidate: Map<string, CandidateGradeRow>;
  isLoading: boolean;
} {
  const userId = useUserId();
  const query = useQuery({
    queryKey: reqGradesKey(integrationId, requisitionExternalId),
    enabled: Boolean(integrationId && requisitionExternalId && userId),
    queryFn: async (): Promise<CandidateGradeRow[]> => {
      if (!integrationId || !requisitionExternalId || !userId) return [];
      // Team-sharing adds a teammate SELECT policy, so scope to own rows —
      // this hook feeds the caller's editors, not the team view.
      const { data, error } = await getSupabase()
        .from('candidate_grades')
        .select(
          'id, user_id, integration_id, requisition_external_id, candidate_external_id, grade, detail_grades, note, updated_at',
        )
        .eq('user_id', userId)
        .eq('integration_id', integrationId)
        .eq('requisition_external_id', requisitionExternalId);
      if (error) throw error;
      return (data ?? []) as CandidateGradeRow[];
    },
  });

  const byCandidate = useMemo(() => {
    const map = new Map<string, CandidateGradeRow>();
    for (const row of query.data ?? []) {
      map.set(row.candidate_external_id, row);
    }
    return map;
  }, [query.data]);

  return { byCandidate, isLoading: query.isLoading };
}

export interface SetCandidateGradeInput {
  integrationId: string;
  requisitionExternalId: string;
  candidateExternalId: string;
  /** The FULL value set (merge partial edits via mergeGrade first). */
  values: GradeValues;
}

export function useSetCandidateGrade() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (input: SetCandidateGradeInput): Promise<void> => {
      const { error } = await getSupabase().rpc('set_candidate_grade', {
        p_integration_id: input.integrationId,
        p_requisition_external_id: input.requisitionExternalId,
        p_candidate_external_id: input.candidateExternalId,
        p_grade: input.values.grade,
        p_detail_grades: input.values.detailGrades,
        p_note: input.values.note,
      });
      if (error) throw error;
    },
    onMutate: async (input) => {
      const key = reqGradesKey(input.integrationId, input.requisitionExternalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CandidateGradeRow[]>(key);
      qc.setQueryData<CandidateGradeRow[]>(key, (rows = []) => {
        const rest = rows.filter(
          (r) => r.candidate_external_id !== input.candidateExternalId,
        );
        if (isEmptyGrade(input.values)) return rest;
        const existing = rows.find(
          (r) => r.candidate_external_id === input.candidateExternalId,
        );
        return [
          ...rest,
          {
            id: existing?.id ?? `optimistic-${input.candidateExternalId}`,
            user_id: userId ?? '',
            integration_id: input.integrationId,
            requisition_external_id: input.requisitionExternalId,
            candidate_external_id: input.candidateExternalId,
            grade: input.values.grade,
            detail_grades: input.values.detailGrades,
            note: input.values.note,
            updated_at: new Date().toISOString(),
          },
        ];
      });
      return { key, previous };
    },
    onError: (_err, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: () => {
      // Reconciles the req-scoped cache and the Candidates-tab view; the
      // refetched data matches the optimistic state, so no visible flicker.
      void qc.invalidateQueries({ queryKey: GRADES_KEY });
    },
  });
}

/** Key for looking a grade up in the useVisibleGrades map. */
export function visibleGradeKey(
  integrationId: string,
  requisitionExternalId: string,
  candidateExternalId: string,
  userId: string,
): string {
  return `${integrationId}:${requisitionExternalId}:${candidateExternalId}:${userId}`;
}

/**
 * Every grade RLS lets the caller see (own + teammates' on shared
 * connections), thinned to the overall number — feeds the Candidates tab's
 * grade chips and sort in both Mine and Team scopes.
 */
export function useVisibleGrades(): {
  gradeByKey: Map<string, number | null>;
  isLoading: boolean;
} {
  const userId = useUserId();
  const query = useQuery({
    queryKey: VISIBLE_GRADES_KEY,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('candidate_grades')
        .select(
          'user_id, integration_id, requisition_external_id, candidate_external_id, grade',
        );
      if (error) throw error;
      return (data ?? []) as Pick<
        CandidateGradeRow,
        | 'user_id'
        | 'integration_id'
        | 'requisition_external_id'
        | 'candidate_external_id'
        | 'grade'
      >[];
    },
  });

  const gradeByKey = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const row of query.data ?? []) {
      map.set(
        visibleGradeKey(
          row.integration_id,
          row.requisition_external_id,
          row.candidate_external_id,
          row.user_id,
        ),
        row.grade,
      );
    }
    return map;
  }, [query.data]);

  return { gradeByKey, isLoading: query.isLoading };
}
