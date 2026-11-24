import { describe, expect, it } from "vitest";
import { duplicateDraft, followUpDraft } from "./ticket-drafts";

const source = {
  title: "Intro to Ratios",
  subject: "Math",
  lessonTopic: "Writing ratios",
  standards: [{ standardId: "s1", code: "6.RP.A.1", framework: "Common Core" }],
  periodIds: ["p2"],
  questions: [
    { prompt: "Old question", questionType: "SHORT_ANSWER" as const, orderIndex: 0, options: [] },
    { prompt: "Another", questionType: "SHORT_ANSWER" as const, orderIndex: 1, options: [] },
  ],
};

describe("followUpDraft", () => {
  it("keeps the ticket's details and starts with the follow-up question", () => {
    expect(followUpDraft(source, "  Which one is part-to-whole? ")).toEqual({
      ...source,
      title: "Intro to Ratios: follow-up",
      questions: [{ prompt: "Which one is part-to-whole?", questionType: "SHORT_ANSWER", orderIndex: 0, options: [] }],
    });
  });
});

describe("duplicateDraft", () => {
  it("copies everything and marks the title", () => {
    expect(duplicateDraft(source)).toEqual({ ...source, title: "Intro to Ratios (copy)" });
  });
});
