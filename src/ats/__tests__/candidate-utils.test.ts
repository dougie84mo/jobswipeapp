import {
  deriveYearsExperience,
  initials,
  parseLooseDate,
  sortMostRecentFirst,
} from '../candidate-utils';
import type { ExperienceEntry } from '../types';

describe('parseLooseDate', () => {
  it('parses full dates, year-month, and bare years', () => {
    expect(parseLooseDate('2022-01-05')).toBeDefined();
    expect(parseLooseDate('2022-01')).toBeDefined();
    expect(parseLooseDate('2022')).toBeDefined();
  });

  it('returns undefined for garbage and empty input', () => {
    expect(parseLooseDate('not a date')).toBeUndefined();
    expect(parseLooseDate('')).toBeUndefined();
    expect(parseLooseDate(undefined)).toBeUndefined();
  });
});

describe('deriveYearsExperience', () => {
  it('returns undefined with no entries or no parseable start', () => {
    expect(deriveYearsExperience(undefined)).toBeUndefined();
    expect(deriveYearsExperience([])).toBeUndefined();
    expect(
      deriveYearsExperience([{ title: 'Engineer', company: 'Acme' }]),
    ).toBeUndefined();
    expect(
      deriveYearsExperience([{ title: 'Engineer', start: 'garbage' }]),
    ).toBeUndefined();
  });

  it('spans earliest start to latest end for closed timelines', () => {
    const entries: ExperienceEntry[] = [
      { title: 'Senior', start: '2020-01', end: '2023-01' },
      { title: 'Junior', start: '2016-01', end: '2019-12' },
    ];
    expect(deriveYearsExperience(entries)).toBe(7);
  });

  it('uses now as the upper bound when a role is open-ended', () => {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 5);
    const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const years = deriveYearsExperience([
      { title: 'Engineer', company: 'Acme', start: iso },
    ]);
    expect(years).toBeGreaterThanOrEqual(4.9);
    expect(years).toBeLessThanOrEqual(5.1);
  });

  it('ignores unparseable dates but keeps parseable siblings', () => {
    const entries: ExperienceEntry[] = [
      { title: 'A', start: 'unknown', end: 'unknown' },
      { title: 'B', start: '2018-01', end: '2020-01' },
    ];
    expect(deriveYearsExperience(entries)).toBe(2);
  });

  it('clamps to [0, 50]', () => {
    expect(
      deriveYearsExperience([{ title: 'A', start: '1900-01', end: '2020-01' }]),
    ).toBe(50);
    expect(
      // End before start (dirty data) clamps to 0 rather than going negative.
      deriveYearsExperience([{ title: 'A', start: '2022-01', end: '2020-01' }]),
    ).toBe(0);
  });
});

describe('sortMostRecentFirst', () => {
  it('puts open-ended entries first, then descending by end date', () => {
    const sorted = sortMostRecentFirst([
      { start: '2010-01', end: '2014-01' },
      { start: '2020-01' }, // current
      { start: '2015-01', end: '2019-12' },
    ]);
    expect(sorted.map((e) => e.start)).toEqual(['2020-01', '2015-01', '2010-01']);
  });

  it('sinks entries with no dates to the bottom', () => {
    const sorted = sortMostRecentFirst([
      {},
      { start: '2018-01', end: '2020-01' },
    ]);
    expect(sorted[0]!.start).toBe('2018-01');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Maya Okafor')).toBe('MO');
    expect(initials('Jean-Luc de la Cruz')).toBe('JD');
    expect(initials('Cher')).toBe('C');
  });

  it('falls back to ? for empty input', () => {
    expect(initials(undefined)).toBe('?');
    expect(initials(null)).toBe('?');
    expect(initials('  ')).toBe('?');
  });
});
