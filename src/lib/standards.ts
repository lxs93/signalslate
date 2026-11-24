export const FRAMEWORKS = ["Common Core", "NGSS", "California"] as const;
export const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

/** A standard on a ticket: an official one (standardId set) or custom text. */
export interface StandardTag {
  standardId: string | null;
  code: string;
  framework?: string;
  description?: string;
}

export interface StandardResult {
  id: string;
  framework: string;
  code: string;
  description: string;
  grade: string;
  subject: string;
}

/**
 * Lowercases and trims a search, and drops the long prefixes teachers often
 * paste, so "CCSS.MATH.CONTENT.6.RP.A.1" finds "6.RP.A.1".
 */
export function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/^ccss\.(math\.content|ela-literacy|math\.practice)\./, "")
    .replace(/^(ccss|ngss)[\s.:-]+/, "")
    .replace(/\s+/g, " ");
}

function gradeNumber(g: string): number | null {
  const v = g.trim().toUpperCase();
  if (v === "PK") return -1;
  if (v === "K") return 0;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

/** True when a standard's grade ("6", "K", "9-12", "K-2") covers the chosen grade. */
export function gradeCovers(standardGrade: string, grade: string): boolean {
  const target = gradeNumber(grade);
  if (target === null) return false;
  const [lo, hi = lo] = standardGrade.split("-");
  const a = gradeNumber(lo);
  const b = gradeNumber(hi);
  return a !== null && b !== null && a <= target && target <= b;
}

/** Orders results: exact code first, then codes that start with the search, then the rest. */
export function rankResults<T extends { code: string; framework: string }>(rows: T[], q: string): T[] {
  const query = normalizeQuery(q);
  const score = (r: T) => {
    const code = r.code.toLowerCase();
    if (code === query) return 0;
    if (code.startsWith(query)) return 1;
    if (code.includes(query)) return 2;
    return 3;
  };
  const fw = (r: T) => {
    const i = FRAMEWORKS.indexOf(r.framework as (typeof FRAMEWORKS)[number]);
    return i === -1 ? FRAMEWORKS.length : i;
  };
  return [...rows].sort(
    (x, y) =>
      score(x) - score(y) ||
      fw(x) - fw(y) ||
      x.code.localeCompare(y.code, undefined, { numeric: true })
  );
}

/**
 * Merges rows that are the same standard listed once per grade (the source
 * data repeats WHST.6-8.2d for grades 6, 7 and 8), keeping the first row's id
 * and widening its grade to the span, e.g. "6-8".
 */
export function mergeGradeRepeats<T extends { framework: string; code: string; description: string; grade: string }>(
  rows: T[]
): T[] {
  const byKey = new Map<string, { row: T; grades: string[] }>();
  for (const row of rows) {
    const key = `${row.framework}|${row.code}|${row.description}`;
    const entry = byKey.get(key);
    if (entry) entry.grades.push(row.grade);
    else byKey.set(key, { row, grades: [row.grade] });
  }
  return [...byKey.values()].map(({ row, grades }) => {
    if (grades.length === 1) return row;
    const bounds = grades.flatMap((g) => g.split("-")).map((g) => ({ g, n: gradeNumber(g) ?? Infinity }));
    bounds.sort((a, b) => a.n - b.n);
    const lo = bounds[0].g;
    const hi = bounds[bounds.length - 1].g;
    return { ...row, grade: lo === hi ? lo : `${lo}-${hi}` };
  });
}

/** "Grade 6", "Kindergarten" or "Grades 6–8" */
export function gradeLabel(grade: string): string {
  if (grade.includes("-")) return `Grades ${grade.replace("-", "–")}`;
  return grade === "K" ? "Kindergarten" : grade === "PK" ? "Pre-K" : `Grade ${grade}`;
}

/** Short framework label for chips. */
export function frameworkLabel(framework: string): string {
  return framework === "Common Core" ? "CCSS" : framework === "California" ? "CA" : framework;
}
