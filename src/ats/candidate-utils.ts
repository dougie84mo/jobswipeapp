// Pure helpers over the normalized Candidate shape.
//
// deriveYearsExperience is mirrored in supabase/functions/_shared/
// candidate-derive.ts (Deno) — keep the two implementations in sync. The Deno
// side runs at normalization time in each provider client; this side serves
// the in-process mock adapter and the UI.

import type { Candidate, ExperienceEntry } from './types';

/** "Maya Okafor" -> "MO". Fallback "?" for empty/missing names. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]!.toUpperCase()).join('');
}

/** Most recent employment entry (entries are normalized most-recent-first). */
export function currentRole(candidate: Candidate): ExperienceEntry | undefined {
  return candidate.experience?.[0];
}

/**
 * Loose date parsing: providers send "2022-01-05", "2022-01", "2022", or full
 * ISO timestamps. Returns epoch ms, or undefined for garbage.
 */
export function parseLooseDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Sort experience/education entries most-recent-first: open-ended entries
 * (no `end`) first, then by end desc, then by start desc. Entries with no
 * parseable dates sink to the bottom in their original order.
 */
export function sortMostRecentFirst<T extends { start?: string; end?: string }>(
  entries: readonly T[],
): T[] {
  const rank = (e: T): number => {
    if (e.start !== undefined || e.end !== undefined) {
      if (e.end === undefined) return Number.MAX_SAFE_INTEGER; // current
      return parseLooseDate(e.end) ?? parseLooseDate(e.start) ?? Number.MIN_SAFE_INTEGER;
    }
    return Number.MIN_SAFE_INTEGER;
  };
  return [...entries].sort((a, b) => rank(b) - rank(a));
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Estimate total years of experience from an employment timeline:
 * (latest end, or now if any entry is open-ended) − earliest parseable start,
 * rounded to 1 decimal and clamped to [0, 50]. Returns undefined when no
 * entry has a parseable start.
 */
export function deriveYearsExperience(
  entries: readonly ExperienceEntry[] | undefined,
): number | undefined {
  if (!entries || entries.length === 0) return undefined;
  let earliestStart: number | undefined;
  let latestEnd: number | undefined;
  let hasOpenEnded = false;
  for (const entry of entries) {
    const start = parseLooseDate(entry.start);
    if (start !== undefined && (earliestStart === undefined || start < earliestStart)) {
      earliestStart = start;
    }
    if (entry.end === undefined) {
      if (start !== undefined || entry.title !== undefined || entry.company !== undefined) {
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
