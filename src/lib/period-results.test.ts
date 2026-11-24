import { describe, expect, it } from "vitest";
import { correctByPeriod } from "./period-results";

const periods = [
  { id: "p2", name: "Period 2" },
  { id: "p5", name: "Period 5" },
];

describe("correctByPeriod", () => {
  it("scores each period from its own students", () => {
    const periodsByStudent = new Map([
      ["a", ["p2"]],
      ["b", ["p2"]],
      ["c", ["p5"]],
      ["d", ["p5"]],
    ]);
    const answers = [
      { studentId: "a", isCorrect: true },
      { studentId: "b", isCorrect: true },
      { studentId: "c", isCorrect: false },
      { studentId: "d", isCorrect: true },
      { studentId: null, isCorrect: false },
    ];
    expect(correctByPeriod(answers, periodsByStudent, periods)).toEqual([
      { periodId: "p2", name: "Period 2", correct: 2, total: 2, percent: 100 },
      { periodId: "p5", name: "Period 5", correct: 1, total: 2, percent: 50 },
    ]);
  });

  it("counts a student in both periods they're in, and leaves empty periods null", () => {
    const result = correctByPeriod(
      [{ studentId: "a", isCorrect: true }],
      new Map([["a", ["p2", "p9"]]]),
      [...periods]
    );
    expect(result.map((r) => [r.name, r.total, r.percent])).toEqual([
      ["Period 2", 1, 100],
      ["Period 5", 0, null],
    ]);
  });
});
