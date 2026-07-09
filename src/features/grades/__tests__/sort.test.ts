import { compareGrades, sortByGrade } from '../sort';

describe('compareGrades', () => {
  it('orders higher grades first', () => {
    expect(compareGrades(90, 50)).toBeLessThan(0);
    expect(compareGrades(50, 90)).toBeGreaterThan(0);
  });

  it('puts graded before ungraded', () => {
    expect(compareGrades(1, null)).toBeLessThan(0);
    expect(compareGrades(undefined, 1)).toBeGreaterThan(0);
  });

  it('treats two ungraded as equal (stable)', () => {
    expect(compareGrades(null, undefined)).toBe(0);
  });
});

describe('sortByGrade', () => {
  const items = [
    { id: 'a', grade: null },
    { id: 'b', grade: 70 },
    { id: 'c', grade: null },
    { id: 'd', grade: 95 },
    { id: 'e', grade: 70 },
  ];

  it('sorts graded desc, ungraded last, ties and ungraded keep input order', () => {
    const sorted = sortByGrade(items, (i) => i.grade);
    expect(sorted.map((i) => i.id)).toEqual(['d', 'b', 'e', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const input = [...items];
    sortByGrade(input, (i) => i.grade);
    expect(input.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
