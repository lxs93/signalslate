export interface OptionResult {
  id: string;
  optionText: string;
  isCorrect: boolean;
  count: number;
  /** Share of this question's answers, 0–100. */
  percent: number;
}

export interface ChoiceResult {
  total: number;
  options: OptionResult[];
  /** Null when the question has no answer key. */
  percentCorrect: number | null;
  correctCount: number;
  /** The wrong option(s) picked most; several when tied, empty when none. */
  topWrongOptionIds: string[];
}

/**
 * Tallies a multiple-choice question's answers.
 * `counts` maps option id to how many students picked it.
 */
export function summarizeChoices(
  options: { id: string; optionText: string; isCorrect: boolean | null }[],
  counts: Map<string, number>
): ChoiceResult {
  const total = options.reduce((sum, o) => sum + (counts.get(o.id) ?? 0), 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const hasKey = options.some((o) => o.isCorrect);

  const results = options.map((o) => {
    const count = counts.get(o.id) ?? 0;
    return { id: o.id, optionText: o.optionText, isCorrect: !!o.isCorrect, count, percent: pct(count) };
  });

  const correctCount = results.filter((o) => o.isCorrect).reduce((s, o) => s + o.count, 0);

  const wrongPicks = hasKey ? results.filter((o) => !o.isCorrect && o.count > 0) : [];
  const maxWrong = Math.max(0, ...wrongPicks.map((o) => o.count));
  const topWrongOptionIds = wrongPicks.filter((o) => o.count === maxWrong).map((o) => o.id);

  return {
    total,
    options: results,
    percentCorrect: hasKey && total ? pct(correctCount) : null,
    correctCount,
    topWrongOptionIds,
  };
}
