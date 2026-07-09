import {
  clampGrade,
  gradeValuesOf,
  isEmptyGrade,
  mergeGrade,
  type GradeValues,
} from '../grade-utils';
import type { CandidateGradeRow } from '../types';

const EMPTY: GradeValues = { grade: null, detailGrades: {}, note: null };

describe('clampGrade', () => {
  it.each([
    [50, 50],
    [1, 1],
    [100, 100],
    [0, 1],
    [-10, 1],
    [101, 100],
    [999, 100],
    [72.6, 73],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampGrade(input)).toBe(expected);
  });

  it('clears on null, undefined, NaN, and Infinity', () => {
    expect(clampGrade(null)).toBeNull();
    expect(clampGrade(undefined)).toBeNull();
    expect(clampGrade(Number.NaN)).toBeNull();
    expect(clampGrade(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('mergeGrade', () => {
  it('sets the overall grade without touching detail grades', () => {
    const current: GradeValues = {
      grade: null,
      detailGrades: { skills: { React: 90 } },
      note: 'keep me',
    };
    const next = mergeGrade(current, { kind: 'overall', value: 80 });
    expect(next.grade).toBe(80);
    expect(next.detailGrades.skills).toEqual({ React: 90 });
    expect(next.note).toBe('keep me');
  });

  it('patches one skill and preserves sibling skills', () => {
    const current: GradeValues = {
      grade: 70,
      detailGrades: { skills: { React: 90, SQL: 60 } },
      note: null,
    };
    const next = mergeGrade(current, { kind: 'skill', name: 'SQL', value: 75 });
    expect(next.detailGrades.skills).toEqual({ React: 90, SQL: 75 });
    expect(next.grade).toBe(70);
  });

  it('deletes a skill key on null value', () => {
    const current: GradeValues = {
      grade: null,
      detailGrades: { skills: { React: 90, SQL: 60 } },
      note: null,
    };
    const next = mergeGrade(current, { kind: 'skill', name: 'SQL', value: null });
    expect(next.detailGrades.skills).toEqual({ React: 90 });
  });

  it('drops the skills object entirely when the last skill clears', () => {
    const current: GradeValues = {
      grade: null,
      detailGrades: { skills: { React: 90 }, categories: { experience: 50 } },
      note: null,
    };
    const next = mergeGrade(current, { kind: 'skill', name: 'React', value: null });
    expect(next.detailGrades.skills).toBeUndefined();
    expect(next.detailGrades.categories).toEqual({ experience: 50 });
  });

  it('patches categories independently of skills', () => {
    const next = mergeGrade(EMPTY, {
      kind: 'category',
      category: 'education',
      value: 65,
    });
    expect(next.detailGrades.categories).toEqual({ education: 65 });
    expect(next.detailGrades.skills).toBeUndefined();
  });

  it('clamps values coming through patches', () => {
    expect(mergeGrade(EMPTY, { kind: 'overall', value: 400 }).grade).toBe(100);
    expect(
      mergeGrade(EMPTY, { kind: 'skill', name: 'Go', value: -3 }).detailGrades
        .skills,
    ).toEqual({ Go: 1 });
  });

  it('normalizes blank notes to null', () => {
    expect(mergeGrade(EMPTY, { kind: 'note', value: '   ' }).note).toBeNull();
    expect(mergeGrade(EMPTY, { kind: 'note', value: 'solid' }).note).toBe('solid');
  });
});

describe('isEmptyGrade', () => {
  it.each<[string, GradeValues, boolean]>([
    ['all empty', EMPTY, true],
    ['blank note only', { grade: null, detailGrades: {}, note: '  ' }, true],
    ['overall set', { grade: 50, detailGrades: {}, note: null }, false],
    [
      'skill set',
      { grade: null, detailGrades: { skills: { React: 1 } }, note: null },
      false,
    ],
    [
      'category set',
      { grade: null, detailGrades: { categories: { experience: 2 } }, note: null },
      false,
    ],
    ['note set', { grade: null, detailGrades: {}, note: 'call them' }, false],
  ])('%s → %p', (_label, values, expected) => {
    expect(isEmptyGrade(values)).toBe(expected);
  });
});

describe('gradeValuesOf', () => {
  it('returns the empty set for a missing row', () => {
    expect(gradeValuesOf(undefined)).toEqual(EMPTY);
  });

  it('mirrors an existing row', () => {
    const row: CandidateGradeRow = {
      id: 'g1',
      user_id: 'u1',
      integration_id: 'i1',
      requisition_external_id: 'r1',
      candidate_external_id: 'c1',
      grade: 82,
      detail_grades: { skills: { React: 90 } },
      note: 'strong',
      updated_at: '2026-07-09T00:00:00Z',
    };
    expect(gradeValuesOf(row)).toEqual({
      grade: 82,
      detailGrades: { skills: { React: 90 } },
      note: 'strong',
    });
  });
});
