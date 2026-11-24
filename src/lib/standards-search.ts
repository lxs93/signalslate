import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { gradeCovers, mergeGradeRepeats, normalizeQuery, rankResults, type StandardResult } from "@/lib/standards";

let gradeValues: string[] | null = null;

/** The distinct grade values in the table (a short list), cached. */
async function allGradeValues() {
  if (!gradeValues) {
    const rows = await db.standard.findMany({ distinct: ["grade"], select: { grade: true } });
    gradeValues = rows.map((r) => r.grade);
  }
  return gradeValues;
}

const select = { id: true, framework: true, code: true, description: true, grade: true, subject: true };

/** Searches codes, descriptions and domain headings. Every word must match. */
export async function searchStandards(
  q: string,
  { framework, grade, limit = 25 }: { framework?: string; grade?: string; limit?: number } = {}
): Promise<StandardResult[]> {
  const query = normalizeQuery(q);
  if (query.length < 2) return [];

  const filters: Prisma.StandardWhereInput[] = [];
  if (framework) filters.push({ framework });
  if (grade) {
    const grades = (await allGradeValues()).filter((g) => gradeCovers(g, grade));
    filters.push({ grade: { in: grades } });
  }

  const [byCode, byText] = await Promise.all([
    db.standard.findMany({
      where: { AND: [...filters, { code: { startsWith: query, mode: "insensitive" } }] },
      select,
      take: limit,
    }),
    db.standard.findMany({
      where: {
        AND: [
          ...filters,
          ...query.split(" ").map((word) => ({
            OR: [
              { code: { contains: word, mode: "insensitive" as const } },
              { description: { contains: word, mode: "insensitive" as const } },
              { context: { contains: word, mode: "insensitive" as const } },
            ],
          })),
        ],
      },
      select,
      take: limit * 2,
    }),
  ]);

  const seen = new Set<string>();
  const merged = [...byCode, ...byText].filter((r) => !seen.has(r.id) && seen.add(r.id));
  return rankResults(mergeGradeRepeats(merged), query).slice(0, limit);
}
