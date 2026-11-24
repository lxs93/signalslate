export interface PeriodScore {
  periodId: string;
  name: string;
  correct: number;
  total: number;
  /** 0–100, or null when nobody in the period answered */
  percent: number | null;
}

/**
 * Share correct on one multiple-choice question, per period. A student counts
 * in every one of the ticket's periods they're enrolled in; answers from
 * students without an account (or not in any of the periods) are left out.
 */
export function correctByPeriod(
  answers: { studentId: string | null; isCorrect: boolean }[],
  periodsByStudent: Map<string, string[]>,
  periods: { id: string; name: string }[]
): PeriodScore[] {
  const tally = new Map(periods.map((p) => [p.id, { correct: 0, total: 0 }]));
  for (const a of answers) {
    if (!a.studentId) continue;
    for (const periodId of periodsByStudent.get(a.studentId) ?? []) {
      const t = tally.get(periodId);
      if (!t) continue;
      t.total += 1;
      if (a.isCorrect) t.correct += 1;
    }
  }
  return periods.map((p) => {
    const t = tally.get(p.id)!;
    return { periodId: p.id, name: p.name, ...t, percent: t.total ? Math.round((t.correct / t.total) * 100) : null };
  });
}
