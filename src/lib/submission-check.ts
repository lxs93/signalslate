interface QuestionShape {
  id: string;
  questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
  orderIndex: number;
  options: { id: string }[];
}

interface ResponseInput {
  questionId: string;
  answerText?: string | null;
  selectedOptionId?: string | null;
}

export type CheckedResponses =
  | { ok: true; responses: { questionId: string; answerText: string | null; selectedOptionId: string | null }[] }
  | { ok: false; error: string };

/**
 * Checks a student's answers against the ticket: exactly one answer per
 * question, text for short answers, and one of that question's own choices for
 * multiple choice. Returns the answers to save, in question order.
 */
export function checkResponses(questions: QuestionShape[], input: ResponseInput[]): CheckedResponses {
  const byQuestion = new Map<string, ResponseInput>();
  for (const r of input) {
    if (!questions.some((q) => q.id === r.questionId)) return { ok: false, error: "One of the answers is for a different exit ticket" };
    if (byQuestion.has(r.questionId)) return { ok: false, error: "Each question can only be answered once" };
    byQuestion.set(r.questionId, r);
  }

  const responses = [];
  for (const q of [...questions].sort((a, b) => a.orderIndex - b.orderIndex)) {
    const r = byQuestion.get(q.id);
    const n = q.orderIndex + 1;
    if (q.questionType === "SHORT_ANSWER") {
      const text = r?.answerText?.trim();
      if (!text) return { ok: false, error: `Please answer question ${n}` };
      responses.push({ questionId: q.id, answerText: text, selectedOptionId: null });
    } else {
      if (!r?.selectedOptionId) return { ok: false, error: `Please choose an answer for question ${n}` };
      if (!q.options.some((o) => o.id === r.selectedOptionId)) return { ok: false, error: `That isn't one of the choices for question ${n}` };
      responses.push({ questionId: q.id, answerText: null, selectedOptionId: r.selectedOptionId });
    }
  }
  return { ok: true, responses };
}
