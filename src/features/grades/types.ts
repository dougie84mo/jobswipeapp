// Manual candidate grading (1-100). Grades are record-only — no ATS writes —
// and exist so a recruiter can rank candidates for client coordination.
// One row per (user, integration, requisition external id, candidate external
// id); see supabase/migrations/0022_candidate_grades.sql.

/** Fixed detail-grade categories shown on the grading screen. */
export const GRADE_CATEGORIES = ['experience', 'education'] as const;
export type GradeCategory = (typeof GRADE_CATEGORIES)[number];

export const GRADE_CATEGORY_LABEL: Record<GradeCategory, string> = {
  experience: 'Experience',
  education: 'Education',
};

/** Per-skill and per-category scores, each 1-100. Stored as jsonb. */
export interface DetailGrades {
  skills?: Record<string, number>;
  categories?: Partial<Record<GradeCategory, number>>;
}

/** candidate_grades row (snake_case DB shape). */
export interface CandidateGradeRow {
  id: string;
  user_id: string;
  integration_id: string;
  requisition_external_id: string;
  candidate_external_id: string;
  grade: number | null;
  detail_grades: DetailGrades;
  note: string | null;
  updated_at: string;
}
