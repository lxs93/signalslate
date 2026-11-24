import { describe, expect, it } from "vitest";
import { groupAnswers, type AnswerRow } from "./answers-by-question";

const row = (name: string, over: Partial<AnswerRow> = {}): AnswerRow => ({
  submissionId: name,
  studentId: null,
  studentName: name,
  answerText: null,
  selectedOptionId: null,
  ...over,
});

describe("groupAnswers", () => {
  it("lists short answers by name and sets blanks apart", () => {
    const result = groupAnswers({ questionType: "SHORT_ANSWER", options: [] }, [
      row("Maria", { answerText: "a comparison" }),
      row("Alex", { answerText: "  " }),
      row("Ava", { answerText: "two amounts" }),
    ]);
    expect(result).toEqual({
      kind: "short",
      answers: [row("Ava", { answerText: "two amounts" }), row("Maria", { answerText: "a comparison" })],
      blank: [row("Alex", { answerText: "  " })],
    });
  });

  it("groups multiple-choice answers under every choice in order", () => {
    const result = groupAnswers(
      {
        questionType: "MULTIPLE_CHOICE",
        options: [
          { id: "a", optionText: "3:5", isCorrect: true },
          { id: "b", optionText: "3:8", isCorrect: null },
          { id: "c", optionText: "8:3", isCorrect: null },
        ],
      },
      [row("Lily", { selectedOptionId: "b" }), row("Alex", { selectedOptionId: "b" }), row("Ava", { selectedOptionId: "a" }), row("Noah")]
    );
    if (result.kind !== "choice") throw new Error("expected choice");
    expect(result.groups.map((g) => [g.optionText, g.isCorrect, g.answers.map((a) => a.studentName)])).toEqual([
      ["3:5", true, ["Ava"]],
      ["3:8", false, ["Alex", "Lily"]],
      ["8:3", false, []],
    ]);
    expect(result.blank.map((r) => r.studentName)).toEqual(["Noah"]);
  });
});
