import { describe, expect, it } from "vitest";
import { checkResponses } from "./submission-check";

const questions = [
  { id: "q1", questionType: "MULTIPLE_CHOICE" as const, orderIndex: 0, options: [{ id: "a" }, { id: "b" }] },
  { id: "q2", questionType: "SHORT_ANSWER" as const, orderIndex: 1, options: [] },
  { id: "q3", questionType: "MULTIPLE_CHOICE" as const, orderIndex: 2, options: [{ id: "c" }] },
];
const good = [
  { questionId: "q2", answerText: "  because  " },
  { questionId: "q1", selectedOptionId: "b", answerText: "ignored" },
  { questionId: "q3", selectedOptionId: "c" },
];

describe("checkResponses", () => {
  it("keeps one clean answer per question, in order", () => {
    expect(checkResponses(questions, good)).toEqual({
      ok: true,
      responses: [
        { questionId: "q1", answerText: null, selectedOptionId: "b" },
        { questionId: "q2", answerText: "because", selectedOptionId: null },
        { questionId: "q3", answerText: null, selectedOptionId: "c" },
      ],
    });
  });

  it("needs every question answered", () => {
    expect(checkResponses(questions, [])).toEqual({ ok: false, error: "Please choose an answer for question 1" });
    expect(checkResponses(questions, good.map((r) => (r.questionId === "q2" ? { ...r, answerText: "   " } : r)))).toEqual({
      ok: false,
      error: "Please answer question 2",
    });
  });

  it("only takes a question's own choices", () => {
    expect(checkResponses(questions, good.map((r) => (r.questionId === "q1" ? { questionId: "q1", selectedOptionId: "c" } : r)))).toEqual({
      ok: false,
      error: "That isn't one of the choices for question 1",
    });
  });

  it("rejects repeated and unknown questions", () => {
    expect(checkResponses(questions, [...good, { questionId: "q1", selectedOptionId: "a" }])).toEqual({
      ok: false,
      error: "Each question can only be answered once",
    });
    expect(checkResponses(questions, [...good, { questionId: "zz", answerText: "x" }])).toEqual({
      ok: false,
      error: "One of the answers is for a different exit ticket",
    });
  });
});
