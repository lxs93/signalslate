/** The four answers to "How sure are you about your answers?" */
export const CONFIDENCE_LEVELS = [
  { value: 1, label: "Not sure" },
  { value: 2, label: "A little sure" },
  { value: 3, label: "Pretty sure" },
  { value: 4, label: "Very sure" },
] as const;

export function confidenceLabel(value: number | null | undefined): string | null {
  return CONFIDENCE_LEVELS.find((l) => l.value === value)?.label ?? null;
}

export interface ConfidenceInput {
  submissionId: string;
  studentName: string;
  confidence: number | null;
  /** Marked multiple-choice questions answered, and how many of those were wrong */
  marked: number;
  wrong: number;
}

export interface ConfidenceSummary {
  /** How many students picked each level, in CONFIDENCE_LEVELS order */
  counts: { value: number; label: string; count: number }[];
  answered: number;
  /** Pretty or very sure, but missed at least one marked question: most sure first */
  confidentButWrong: ConfidenceInput[];
}

export function summarizeConfidence(rows: ConfidenceInput[]): ConfidenceSummary {
  const rated = rows.filter((r) => r.confidence !== null);
  return {
    counts: CONFIDENCE_LEVELS.map((l) => ({
      value: l.value,
      label: l.label,
      count: rated.filter((r) => r.confidence === l.value).length,
    })),
    answered: rated.length,
    confidentButWrong: rated
      .filter((r) => r.confidence! >= 3 && r.wrong > 0)
      .sort((a, b) => b.confidence! - a.confidence! || b.wrong - a.wrong || a.studentName.localeCompare(b.studentName)),
  };
}
