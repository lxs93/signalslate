import { describe, expect, it } from "vitest";
import { matchStudentId } from "./match-student";

const subs = [
  { studentId: "priya", studentName: "Priya Patel" },
  { studentId: "noah-g", studentName: "Noah Garcia" },
  { studentId: "noah-k", studentName: "Noah Kim" },
];

describe("matchStudentId", () => {
  it("matches a full name, ignoring case and spacing", () => {
    expect(matchStudentId("  priya   PATEL ", subs)).toBe("priya");
  });

  it("matches a first name only one student has", () => {
    expect(matchStudentId("Priya", subs)).toBe("priya");
  });

  it("refuses a first name two students share", () => {
    expect(matchStudentId("Noah", subs)).toBeNull();
  });

  it("returns null for an unknown name", () => {
    expect(matchStudentId("Zed", subs)).toBeNull();
  });
});
