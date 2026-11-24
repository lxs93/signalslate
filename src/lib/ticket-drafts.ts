import type { TicketDraft } from "@/components/ticket-editor";

/** A copy of a ticket as a new draft, e.g. "Intro to Ratios (copy)". */
export function duplicateDraft(source: TicketDraft): TicketDraft {
  return { ...source, title: `${source.title} (copy)` };
}

/**
 * A new draft for the next lesson that starts from an analysis's suggested
 * follow-up question. Keeps the subject, topic, standards and periods; the
 * teacher adds at least one more question.
 */
export function followUpDraft(source: TicketDraft, followupQuestion: string): TicketDraft {
  return {
    ...source,
    title: `${source.title}: follow-up`,
    questions: [
      { prompt: followupQuestion.trim(), questionType: "SHORT_ANSWER", orderIndex: 0, options: [] },
    ],
  };
}
