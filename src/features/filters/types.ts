// Candidate preference filters — the recruiter's dating-app-style criteria.
//
// Two scopes, merged key-wise at the deck:
// - Global defaults live at recruiter_profiles.app_prefs.candidate_filters.
// - Per-requisition overrides live in the requisition_filters table
//   (one row per user x integration x requisition).
//
// Missing-data rule: real providers frequently leave candidate fields empty
// (half send no skills; several send name-only). A candidate MISSING the
// filtered field PASSES by default — a filter narrows on evidence, it doesn't
// punish absent data. Each filter carries a `strict` toggle to flip that
// ("also exclude candidates missing this info"). hasResume is inherently
// strict — requiring a resume IS a requirement on presence.

export interface SkillsFilter {
  values: string[];
  /** 'any': at least one value matches; 'all': every value must match. */
  mode: 'any' | 'all';
  strict?: boolean;
}

export interface YearsFilter {
  min?: number;
  max?: number;
  strict?: boolean;
}

export interface LocationsFilter {
  /** Case-insensitive substring match, any-of. */
  values: string[];
  strict?: boolean;
}

export interface EducationFilter {
  /** Case-insensitive keywords matched against school, degree, and field. */
  keywords: string[];
  strict?: boolean;
}

export interface CandidateFilters {
  skills?: SkillsFilter;
  yearsExperience?: YearsFilter;
  locations?: LocationsFilter;
  education?: EducationFilter;
  /** true = only candidates with a resume link. */
  hasResume?: boolean;
}

export const EMPTY_FILTERS: CandidateFilters = {};
