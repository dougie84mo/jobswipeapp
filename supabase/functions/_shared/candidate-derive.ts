// Shared candidate-derivation helpers for the Deno provider clients.
//
// Mirrors src/ats/candidate-utils.ts (app side) — keep the two in sync.
// Provider clients map raw employment/education payloads into these Norm
// entry shapes at normalization time and derive yearsExperience when the
// provider gives history but no explicit number.

/**
 * One employment span, normalized. Dates are loose strings ("2022-01-05",
 * "2022-01", "2022") because providers disagree. `end` absent = current role.
 */
export interface NormExperienceEntry {
  title?: string;
  company?: string;
  start?: string;
  end?: string;
  summary?: string;
}

export interface NormEducationEntry {
  school: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

/** Loose date parsing → epoch ms, or undefined for garbage. */
export function parseLooseDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Sort entries most-recent-first: open-ended entries (no `end`) first, then
 * by end desc, then start desc; undateable entries sink to the bottom.
 */
export function sortMostRecentFirst<T extends { start?: string; end?: string }>(
  entries: readonly T[],
): T[] {
  const rank = (e: T): number => {
    if (e.start !== undefined || e.end !== undefined) {
      if (e.end === undefined) return Number.MAX_SAFE_INTEGER;
      return parseLooseDate(e.end) ?? parseLooseDate(e.start) ??
        Number.MIN_SAFE_INTEGER;
    }
    return Number.MIN_SAFE_INTEGER;
  };
  return [...entries].sort((a, b) => rank(b) - rank(a));
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Estimate total years of experience from an employment timeline:
 * (latest end, or now if any entry is open-ended) − earliest parseable start,
 * rounded to 1 decimal, clamped to [0, 50]. Undefined when no entry has a
 * parseable start.
 */
export function deriveYearsExperience(
  entries: readonly NormExperienceEntry[] | undefined,
): number | undefined {
  if (!entries || entries.length === 0) return undefined;
  let earliestStart: number | undefined;
  let latestEnd: number | undefined;
  let hasOpenEnded = false;
  for (const entry of entries) {
    const start = parseLooseDate(entry.start);
    if (
      start !== undefined &&
      (earliestStart === undefined || start < earliestStart)
    ) {
      earliestStart = start;
    }
    if (entry.end === undefined) {
      if (
        start !== undefined || entry.title !== undefined ||
        entry.company !== undefined
      ) {
        hasOpenEnded = true;
      }
    } else {
      const end = parseLooseDate(entry.end);
      if (end !== undefined && (latestEnd === undefined || end > latestEnd)) {
        latestEnd = end;
      }
    }
  }
  if (earliestStart === undefined) return undefined;
  const upper = hasOpenEnded ? Date.now() : latestEnd;
  if (upper === undefined || upper <= earliestStart) return 0;
  const years = (upper - earliestStart) / MS_PER_YEAR;
  return Math.min(50, Math.max(0, Math.round(years * 10) / 10));
}
