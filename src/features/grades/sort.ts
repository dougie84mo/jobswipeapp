// Grade ordering shared by the Grade deck mode and the Candidates tab:
// graded before ungraded, higher grades first, everything else keeps its
// incoming order (Array.prototype.sort is stable).

export function compareGrades(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const hasA = a != null;
  const hasB = b != null;
  if (hasA && hasB) return b - a;
  if (hasA) return -1;
  if (hasB) return 1;
  return 0;
}

/** Non-mutating sort by grade (desc, ungraded last, otherwise stable). */
export function sortByGrade<T>(
  items: readonly T[],
  gradeOf: (item: T) => number | null | undefined,
): T[] {
  return [...items].sort((x, y) => compareGrades(gradeOf(x), gradeOf(y)));
}
