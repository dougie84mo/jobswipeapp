import type { Candidate } from '@/ats/types';
import {
  activeFilterCount,
  candidatePassesFilters,
  effectiveFilters,
  filtersKey,
} from '@/features/filters/predicate';
import type { CandidateFilters } from '@/features/filters/types';

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    externalId: 'c1',
    requisitionExternalId: 'r1',
    fullName: 'Test Candidate',
    raw: {},
    ...overrides,
  };
}

describe('candidatePassesFilters', () => {
  it('passes everything with empty filters', () => {
    expect(candidatePassesFilters(candidate(), {})).toBe(true);
  });

  describe('skills', () => {
    const withSkills = candidate({ skills: ['TypeScript', 'React', 'AWS'] });

    it('any-mode passes when at least one value matches (case-insensitive)', () => {
      expect(
        candidatePassesFilters(withSkills, {
          skills: { values: ['typescript', 'Rust'], mode: 'any' },
        }),
      ).toBe(true);
    });

    it('any-mode fails when nothing matches', () => {
      expect(
        candidatePassesFilters(withSkills, {
          skills: { values: ['Rust'], mode: 'any' },
        }),
      ).toBe(false);
    });

    it('all-mode requires every value', () => {
      expect(
        candidatePassesFilters(withSkills, {
          skills: { values: ['TypeScript', 'AWS'], mode: 'all' },
        }),
      ).toBe(true);
      expect(
        candidatePassesFilters(withSkills, {
          skills: { values: ['TypeScript', 'Rust'], mode: 'all' },
        }),
      ).toBe(false);
    });

    it('missing skills pass non-strict, fail strict', () => {
      const noSkills = candidate();
      const base = { values: ['TypeScript'], mode: 'any' as const };
      expect(candidatePassesFilters(noSkills, { skills: base })).toBe(true);
      expect(
        candidatePassesFilters(noSkills, { skills: { ...base, strict: true } }),
      ).toBe(false);
    });

    it('an emptied section is inert even with strict on', () => {
      expect(
        candidatePassesFilters(candidate(), {
          skills: { values: [], mode: 'all', strict: true },
        }),
      ).toBe(true);
    });
  });

  describe('yearsExperience', () => {
    it('enforces min and max bounds', () => {
      const c = candidate({ yearsExperience: 5 });
      expect(candidatePassesFilters(c, { yearsExperience: { min: 3 } })).toBe(true);
      expect(candidatePassesFilters(c, { yearsExperience: { min: 6 } })).toBe(false);
      expect(candidatePassesFilters(c, { yearsExperience: { max: 5 } })).toBe(true);
      expect(candidatePassesFilters(c, { yearsExperience: { max: 4 } })).toBe(false);
      expect(
        candidatePassesFilters(c, { yearsExperience: { min: 3, max: 8 } }),
      ).toBe(true);
    });

    it('missing years pass non-strict, fail strict', () => {
      const c = candidate();
      expect(candidatePassesFilters(c, { yearsExperience: { min: 3 } })).toBe(true);
      expect(
        candidatePassesFilters(c, { yearsExperience: { min: 3, strict: true } }),
      ).toBe(false);
    });
  });

  describe('locations', () => {
    it('matches substrings case-insensitively, any-of', () => {
      const c = candidate({ location: 'Remote — EU (Berlin)' });
      expect(
        candidatePassesFilters(c, { locations: { values: ['remote'] } }),
      ).toBe(true);
      expect(
        candidatePassesFilters(c, { locations: { values: ['Austin', 'berlin'] } }),
      ).toBe(true);
      expect(
        candidatePassesFilters(c, { locations: { values: ['Austin'] } }),
      ).toBe(false);
    });

    it('missing location passes non-strict, fails strict', () => {
      const c = candidate();
      expect(candidatePassesFilters(c, { locations: { values: ['NYC'] } })).toBe(true);
      expect(
        candidatePassesFilters(c, { locations: { values: ['NYC'], strict: true } }),
      ).toBe(false);
    });
  });

  describe('education', () => {
    const c = candidate({
      education: [
        { school: 'State University', degree: 'B.S.', field: 'Computer Science' },
      ],
    });

    it('matches keywords against school, degree, and field', () => {
      expect(
        candidatePassesFilters(c, { education: { keywords: ['computer'] } }),
      ).toBe(true);
      expect(
        candidatePassesFilters(c, { education: { keywords: ['state'] } }),
      ).toBe(true);
      expect(
        candidatePassesFilters(c, { education: { keywords: ['philosophy'] } }),
      ).toBe(false);
    });

    it('missing education passes non-strict, fails strict', () => {
      const bare = candidate();
      expect(
        candidatePassesFilters(bare, { education: { keywords: ['cs'] } }),
      ).toBe(true);
      expect(
        candidatePassesFilters(bare, {
          education: { keywords: ['cs'], strict: true },
        }),
      ).toBe(false);
    });
  });

  describe('hasResume', () => {
    it('is inherently strict', () => {
      expect(
        candidatePassesFilters(candidate({ resumeUrl: 'https://x/r.pdf' }), {
          hasResume: true,
        }),
      ).toBe(true);
      expect(candidatePassesFilters(candidate(), { hasResume: true })).toBe(false);
    });
  });
});

describe('effectiveFilters', () => {
  const global: CandidateFilters = {
    skills: { values: ['TypeScript'], mode: 'any' },
    yearsExperience: { min: 3 },
  };

  it('returns global when no override exists', () => {
    expect(effectiveFilters(global, undefined)).toEqual(global);
  });

  it('per-req keys replace global keys; absent keys inherit', () => {
    const merged = effectiveFilters(global, {
      skills: { values: ['Figma'], mode: 'all' },
    });
    expect(merged.skills).toEqual({ values: ['Figma'], mode: 'all' });
    expect(merged.yearsExperience).toEqual({ min: 3 });
  });

  it('an explicitly emptied per-req section clears the global one', () => {
    const merged = effectiveFilters(global, {
      skills: { values: [], mode: 'any' },
    });
    expect(merged.skills).toEqual({ values: [], mode: 'any' });
    // ...and the empty section is inert at evaluation time.
    expect(candidatePassesFilters(candidate(), merged)).toBe(true);
  });
});

describe('filtersKey', () => {
  it('is stable across key ordering', () => {
    const a: CandidateFilters = {
      skills: { values: ['a'], mode: 'any' },
      hasResume: true,
    };
    const b: CandidateFilters = {
      hasResume: true,
      skills: { mode: 'any', values: ['a'] },
    };
    expect(filtersKey(a)).toBe(filtersKey(b));
  });

  it('distinguishes different filters', () => {
    expect(filtersKey({ hasResume: true })).not.toBe(filtersKey({}));
  });
});

describe('activeFilterCount', () => {
  it('counts only sections with real values', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(
      activeFilterCount({
        skills: { values: [], mode: 'any' },
        yearsExperience: {},
        locations: { values: ['  '] },
      }),
    ).toBe(0);
    expect(
      activeFilterCount({
        skills: { values: ['x'], mode: 'any' },
        yearsExperience: { max: 10 },
        hasResume: true,
      }),
    ).toBe(3);
  });
});
