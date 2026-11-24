import { compareNames } from "@/lib/names";

/** One student's answer to one question. */
export interface AnswerRow {
  submissionId: string;
  studentId: string | null;
  studentName: string;
  answerText: string | null;
  selectedOptionId: string | null;
}

interface QuestionShape {
  questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
  options: { id: string; optionText: string; isCorrect: boolean | null }[];
}

export type GroupedAnswers =
  | { kind: "short"; answers: AnswerRow[]; blank: AnswerRow[] }
  | {
      kind: "choice";
      groups: { optionId: string; optionText: string; isCorrect: boolean; answers: AnswerRow[] }[];
      blank: AnswerRow[];
    };

const byName = (a: AnswerRow, b: AnswerRow) => compareNames(a.studentName, b.studentName);

/**
 * Lays out every student's answer to one question: short answers in name
 * order, or multiple-choice answers grouped under the choice picked (every
 * choice listed, in the ticket's order). Students who left it empty go in `blank`.
 */
export function groupAnswers(question: QuestionShape, rows: AnswerRow[]): GroupedAnswers {
  if (question.questionType === "SHORT_ANSWER") {
    const answered = rows.filter((r) => r.answerText?.trim());
    return {
      kind: "short",
      answers: answered.sort(byName),
      blank: rows.filter((r) => !r.answerText?.trim()).sort(byName),
    };
  }

  const known = new Set(question.options.map((o) => o.id));
  return {
    kind: "choice",
    groups: question.options.map((o) => ({
      optionId: o.id,
      optionText: o.optionText,
      isCorrect: !!o.isCorrect,
      answers: rows.filter((r) => r.selectedOptionId === o.id).sort(byName),
    })),
    blank: rows.filter((r) => !r.selectedOptionId || !known.has(r.selectedOptionId)).sort(byName),
  };
}
