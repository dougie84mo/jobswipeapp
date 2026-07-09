// Pure grade helpers. The RPC (set_candidate_grade) replaces the row
// wholesale, so the client merges each partial edit into the full grade
// object here before sending it.

import type { CandidateGradeRow, DetailGrades, GradeCategory } from './types';

export const GRADE_MIN = 1;
export const GRADE_MAX = 100;

/** Clamp to the 1-100 integer scale; non-finite input clears the grade. */
export function clampGrade(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(GRADE_MAX, Math.max(GRADE_MIN, Math.round(value)));
}

/** The full value set the RPC persists (camelCase mirror of the row). */
export interface GradeValues {
  grade: number | null;
  detailGrades: DetailGrades;
  note: string | null;
}

/** One edit from a single control; null value deletes that key. */
export type GradePatch =
  | { kind: 'overall'; value: number | null }
  | { kind: 'skill'; name: string; value: number | null }
  | { kind: 'category'; category: GradeCategory; value: number | null }
  | { kind: 'note'; value: string | null };

function pruneRecord<K extends string>(
  record: Partial<Record<K, number | undefined>> | undefined,
): Record<K, number> | undefined {
  if (!record) return undefined;
  const entries = Object.entries(record).filter(([, v]) => v != null);
  return entries.length > 0
    ? (Object.fromEntries(entries) as Record<K, number>)
    : undefined;
}

/** True when the value set carries nothing — the RPC deletes such rows. */
export function isEmptyGrade(values: GradeValues): boolean {
  const skills = pruneRecord(values.detailGrades.skills);
  const categories = pruneRecord(values.detailGrades.categories);
  const note = values.note?.trim() ?? '';
  return values.grade == null && !skills && !categories && note.length === 0;
}

/** Current values of a row (or the empty set when the row doesn't exist). */
export function gradeValuesOf(row: CandidateGradeRow | undefined): GradeValues {
  if (!row) return { grade: null, detailGrades: {}, note: null };
  return { grade: row.grade, detailGrades: row.detail_grades ?? {}, note: row.note };
}

/** Merge one control's edit into the full value set (server replaces). */
export function mergeGrade(current: GradeValues, patch: GradePatch): GradeValues {
  switch (patch.kind) {
    case 'overall':
      return { ...current, grade: clampGrade(patch.value) };
    case 'skill': {
      const skills = pruneRecord({
        ...current.detailGrades.skills,
        [patch.name]: clampGrade(patch.value) ?? undefined,
      });
      return {
        ...current,
        detailGrades: { ...current.detailGrades, skills },
      };
    }
    case 'category': {
      const categories = pruneRecord({
        ...current.detailGrades.categories,
        [patch.category]: clampGrade(patch.value) ?? undefined,
      });
      return {
        ...current,
        detailGrades: { ...current.detailGrades, categories },
      };
    }
    case 'note': {
      const note = patch.value?.trim() ?? '';
      return { ...current, note: note.length > 0 ? patch.value : null };
    }
  }
}
