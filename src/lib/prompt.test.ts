import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, formatStandards } from "./prompt";

const ticket = {
  title: "Intro to Ratios",
  subject: "Math",
  lessonTopic: "Writing ratios",
  questions: [
    { id: "q1", prompt: "What is a ratio?", questionType: "SHORT_ANSWER" as const, orderIndex: 0, options: [] },
  ],
};
const submissions = [
  {
    id: "s1",
    studentName: "Lily Chen",
    submittedAt: new Date(),
    responses: [{ id: "r1", questionId: "q1", answerText: "a comparison", selectedOptionId: null, selectedOption: null }],
  },
];

describe("formatStandards", () => {
  it("writes official standards with their description and custom codes as the teacher's own", () => {
    expect(
      formatStandards([
        { code: "6.RP.A.1", framework: "Common Core", description: "Understand the concept of a ratio." },
        { code: "District M6-4" },
      ])
    ).toBe("- Common Core 6.RP.A.1: Understand the concept of a ratio.\n- District M6-4 (the teacher's own code)");
  });
});

describe("buildAnalysisPrompt", () => {
  it("lists the standards when the ticket has them", () => {
    const prompt = buildAnalysisPrompt(
      { ...ticket, standards: [{ code: "6.RP.A.1", framework: "Common Core", description: "Understand ratios." }] },
      submissions
    );
    expect(prompt).toContain("STANDARDS THIS TICKET CHECKS:\n- Common Core 6.RP.A.1: Understand ratios.");
  });

  it("leaves the section out when there are none", () => {
    expect(buildAnalysisPrompt(ticket, submissions)).not.toContain("STANDARDS");
  });
});
