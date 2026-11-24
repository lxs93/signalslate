import { describe, expect, it } from "vitest";
import { summarizeChoices } from "./choice-results";

const options = [
  { id: "a", optionText: "A", isCorrect: true },
  { id: "b", optionText: "B", isCorrect: null },
  { id: "c", optionText: "C", isCorrect: null },
  { id: "d", optionText: "D", isCorrect: null },
];

describe("summarizeChoices", () => {
  it("scores answers against the key", () => {
    const r = summarizeChoices(options, new Map([["a", 8], ["b", 3], ["c", 1]]));
    expect(r.total).toBe(12);
    expect(r.correctCount).toBe(8);
    expect(r.percentCorrect).toBe(67);
    expect(r.options.map((o) => o.percent)).toEqual([67, 25, 8, 0]);
    expect(r.topWrongOptionIds).toEqual(["b"]);
  });

  it("marks every wrong answer tied for most picked", () => {
    const r = summarizeChoices(options, new Map([["a", 8], ["b", 2], ["c", 2]]));
    expect(r.topWrongOptionIds).toEqual(["b", "c"]);
  });

  it("has no wrong answer to flag when everyone is right", () => {
    const r = summarizeChoices(options, new Map([["a", 5]]));
    expect(r.percentCorrect).toBe(100);
    expect(r.topWrongOptionIds).toEqual([]);
  });

  it("reports no score for a question without a key", () => {
    const unkeyed = options.map((o) => ({ ...o, isCorrect: null }));
    const r = summarizeChoices(unkeyed, new Map([["a", 1], ["b", 3]]));
    expect(r.percentCorrect).toBeNull();
    expect(r.topWrongOptionIds).toEqual([]);
  });

  it("handles a question nobody answered", () => {
    const r = summarizeChoices(options, new Map());
    expect(r.total).toBe(0);
    expect(r.percentCorrect).toBeNull();
    expect(r.options.every((o) => o.percent === 0)).toBe(true);
  });
});
