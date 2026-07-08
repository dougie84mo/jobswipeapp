// Pure filter logic — no I/O, exhaustively Jest-tested. The deck query
// applies candidatePassesFilters per page, right after the already-swiped
// filter (src/features/swipes/queries.ts).

import type { Candidate } from '@/ats/types';
import type { CandidateFilters } from './types';

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** A filter section with no values set is inert regardless of strictness. */
function hasValues(values: string[] | undefined): boolean {
  return Boolean(values && values.some((v) => v.trim().length > 0));
}

export function candidatePassesFilters(
  candidate: Candidate,
  filters: CandidateFilters,
): boolean {
  const { skills, yearsExperience, locations, education, hasResume } = filters;

  if (skills && hasValues(skills.values)) {
    const wanted = skills.values.filter((v) => v.trim().length > 0).map(norm);
    const have = new Set((candidate.skills ?? []).map(norm));
    if (have.size === 0) {
      if (skills.strict) return false;
    } else {
      const matches = wanted.filter((w) => have.has(w));
      if (skills.mode === 'all' ? matches.length < wanted.length : matches.length === 0) {
        return false;
      }
    }
  }

  if (
    yearsExperience &&
    (yearsExperience.min !== undefined || yearsExperience.max !== undefined)
  ) {
    const years = candidate.yearsExperience;
    if (years === undefined) {
      if (yearsExperience.strict) return false;
    } else {
      if (yearsExperience.min !== undefined && years < yearsExperience.min) return false;
      if (yearsExperience.max !== undefined && years > yearsExperience.max) return false;
    }
  }

  if (locations && hasValues(locations.values)) {
    const location = candidate.location;
    if (!location || location.trim().length === 0) {
      if (locations.strict) return false;
    } else {
      const haystack = norm(location);
      const hit = locations.values.some(
        (v) => v.trim().length > 0 && haystack.includes(norm(v)),
      );
      if (!hit) return false;
    }
  }

  if (education && hasValues(education.keywords)) {
    const entries = candidate.education ?? [];
    if (entries.length === 0) {
      if (education.strict) return false;
    } else {
      const haystack = entries
        .flatMap((e) => [e.school, e.degree, e.field])
        .filter((s): s is string => Boolean(s))
        .map(norm)
        .join(' | ');
      const hit = education.keywords.some(
        (k) => k.trim().length > 0 && haystack.includes(norm(k)),
      );
      if (!hit) return false;
    }
  }

  if (hasResume === true && !candidate.resumeUrl) return false;

  return true;
}

/**
 * Merge global defaults with a per-requisition override, key-wise: a per-req
 * key REPLACES the global key entirely — including an explicitly emptied one
 * (e.g. skills: { values: [], mode: 'any' } meaning "no skill filter for this
 * requisition"). Absent per-req keys inherit the global value.
 */
export function effectiveFilters(
  global: CandidateFilters | undefined,
  perReq: CandidateFilters | undefined,
): CandidateFilters {
  if (!perReq) return global ?? {};
  if (!global) return perReq;
  const merged: CandidateFilters = { ...global };
  for (const key of Object.keys(perReq) as (keyof CandidateFilters)[]) {
    const value = perReq[key];
    if (value === undefined) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/**
 * Stable serialization for query keys: sorted keys at every level so two
 * semantically equal filter objects produce the same string.
 */
export function filtersKey(filters: CandidateFilters): string {
  const sortValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1));
      return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
    }
    return value;
  };
  return JSON.stringify(sortValue(filters));
}

/** How many filter sections are active — drives the funnel-icon badge. */
export function activeFilterCount(filters: CandidateFilters): number {
  let count = 0;
  if (filters.skills && hasValues(filters.skills.values)) count++;
  if (
    filters.yearsExperience &&
    (filters.yearsExperience.min !== undefined ||
      filters.yearsExperience.max !== undefined)
  ) {
    count++;
  }
  if (filters.locations && hasValues(filters.locations.values)) count++;
  if (filters.education && hasValues(filters.education.keywords)) count++;
  if (filters.hasResume === true) count++;
  return count;
}
