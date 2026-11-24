/**
 * Loads the official standards in data/standards into the standards table.
 * Used by the seed and by `npm run standards:load`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";

const FILES = ["ccss.json", "ngss.json", "ca.json"];

interface StandardFile {
  framework: string;
  standards: {
    id: string;
    code: string;
    description: string;
    grade: string;
    subject: string;
    context: string;
  }[];
}

/** Adds any standards not already in the table. Returns how many each file has. */
export async function loadStandards(db: PrismaClient) {
  const counts: Record<string, number> = {};
  for (const file of FILES) {
    const data: StandardFile = JSON.parse(
      readFileSync(join(process.cwd(), "data/standards", file), "utf8")
    );
    // Entries without a code are notes like "(Begins in grade 3)", not standards.
    const rows = data.standards
      .filter((s) => s.code.trim())
      .map((s) => ({
        id: s.id,
        framework: data.framework,
        code: s.code.trim(),
        description: s.description,
        grade: s.grade,
        subject: s.subject,
        context: s.context ?? "",
      }));
    for (let i = 0; i < rows.length; i += 2000) {
      await db.standard.createMany({ data: rows.slice(i, i + 2000), skipDuplicates: true });
    }
    counts[data.framework] = rows.length;
  }
  return counts;
}
