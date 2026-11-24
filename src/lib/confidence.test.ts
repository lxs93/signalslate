import { describe, expect, it } from "vitest";
import { confidenceLabel, summarizeConfidence, type ConfidenceInput } from "./confidence";

const row = (studentName: string, confidence: number | null, wrong = 0, marked = 1): ConfidenceInput => ({
  submissionId: studentName,
  studentName,
  confidence,
  marked,
  wrong,
});

describe("confidenceLabel", () => {
  it("names each level and nothing else", () => {
    expect(confidenceLabel(1)).toBe("Not sure");
    expect(confidenceLabel(4)).toBe("Very sure");
    expect(confidenceLabel(null)).toBeNull();
    expect(confidenceLabel(7)).toBeNull();
  });
});

describe("summarizeConfidence", () => {
  const summary = summarizeConfidence([
    row("Ava", 4),
    row("Alex", 4, 1),
    row("Emma", 3, 1),
    row("Lily", 1, 1),
    row("Noah", null, 1),
    row("Zoe", 3, 2),
  ]);

  it("counts each level among students who answered it", () => {
    expect(summary.answered).toBe(5);
    expect(summary.counts.map((c) => c.count)).toEqual([1, 0, 2, 2]);
  });

  it("lists students who were sure but missed a marked question, surest first", () => {
    expect(summary.confidentButWrong.map((r) => r.studentName)).toEqual(["Alex", "Zoe", "Emma"]);
  });
});
