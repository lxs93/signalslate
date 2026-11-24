/** What one answered ticket contributes to the standards it's tagged with. */
export interface TicketForStandards {
  id: string;
  title: string;
  standards: { standardId: string | null; code: string; framework: string | null; description: string | null }[];
  /** Answers to multiple-choice questions that have a correct choice marked */
  correct: number;
  marked: number;
  /** Theme tags from the ticket's latest analysis */
  themes: string[];
  /** Check-in flags from the latest analysis not yet marked checked in */
  openFlags: number;
}

export interface StandardTrend {
  key: string;
  code: string;
  framework: string | null;
  description: string | null;
  tickets: { id: string; title: string }[];
  correct: number;
  marked: number;
  /** Null when none of its tickets has a marked multiple-choice question */
  percentCorrect: number | null;
  openFlags: number;
  /** Up to three themes, most frequent first */
  topThemes: string[];
}

/**
 * Rolls tickets up by standard. Standards with the lowest share correct come
 * first, then those with the most open check-ins.
 */
export function summarizeStandardTrends(tickets: TicketForStandards[]): StandardTrend[] {
  const byKey = new Map<string, StandardTrend & { themeCounts: Map<string, number> }>();

  for (const t of tickets) {
    for (const s of t.standards) {
      const key = s.standardId ?? `custom:${s.code.toLowerCase()}`;
      let row = byKey.get(key);
      if (!row) {
        row = {
          key,
          code: s.code,
          framework: s.framework,
          description: s.description,
          tickets: [],
          correct: 0,
          marked: 0,
          percentCorrect: null,
          openFlags: 0,
          topThemes: [],
          themeCounts: new Map(),
        };
        byKey.set(key, row);
      }
      row.tickets.push({ id: t.id, title: t.title });
      row.correct += t.correct;
      row.marked += t.marked;
      row.openFlags += t.openFlags;
      for (const theme of t.themes) row.themeCounts.set(theme, (row.themeCounts.get(theme) ?? 0) + 1);
    }
  }

  const rows = [...byKey.values()].map(({ themeCounts, ...row }) => ({
    ...row,
    percentCorrect: row.marked ? Math.round((row.correct / row.marked) * 100) : null,
    topThemes: [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name]) => name),
  }));

  return rows.sort(
    (a, b) =>
      (a.percentCorrect ?? 101) - (b.percentCorrect ?? 101) ||
      b.openFlags - a.openFlags ||
      b.tickets.length - a.tickets.length ||
      a.code.localeCompare(b.code, undefined, { numeric: true })
  );
}
