import { describe, expect, it } from "vitest";
import { gradeCovers, gradeLabel, mergeGradeRepeats, normalizeQuery, rankResults } from "./standards";

describe("normalizeQuery", () => {
  it("drops long Common Core prefixes", () => {
    expect(normalizeQuery("CCSS.MATH.CONTENT.6.RP.A.1")).toBe("6.rp.a.1");
    expect(normalizeQuery("CCSS.ELA-LITERACY.RL.5.2")).toBe("rl.5.2");
  });

  it("drops a leading framework name", () => {
    expect(normalizeQuery("NGSS 5-PS1-1")).toBe("5-ps1-1");
    expect(normalizeQuery("  ccss  RI.5.2 ")).toBe("ri.5.2");
  });

  it("collapses spaces in word searches", () => {
    expect(normalizeQuery("  unit   rate ")).toBe("unit rate");
  });
});

describe("gradeCovers", () => {
  it("matches single grades", () => {
    expect(gradeCovers("6", "6")).toBe(true);
    expect(gradeCovers("6", "7")).toBe(false);
    expect(gradeCovers("K", "K")).toBe(true);
  });

  it("matches grade bands", () => {
    expect(gradeCovers("9-12", "10")).toBe(true);
    expect(gradeCovers("K-2", "K")).toBe(true);
    expect(gradeCovers("K-2", "3")).toBe(false);
    expect(gradeCovers("6-8", "8")).toBe(true);
  });

  it("ignores values it can't read", () => {
    expect(gradeCovers("HS", "10")).toBe(false);
    expect(gradeCovers("6", "sixth")).toBe(false);
  });
});

describe("rankResults", () => {
  it("puts the exact code first, then code prefixes, with Common Core before California in each group", () => {
    const rows = [
      { code: "6.RP.3", framework: "California" },
      { code: "7.RP.A.1", framework: "Common Core" },
      { code: "6.RP.A.1", framework: "California" },
      { code: "6.RP.A.1", framework: "Common Core" },
      { code: "6.RP.A.10", framework: "Common Core" },
    ];
    expect(rankResults(rows, "6.RP.A.1").map((r) => `${r.framework} ${r.code}`)).toEqual([
      "Common Core 6.RP.A.1",
      "California 6.RP.A.1",
      "Common Core 6.RP.A.10",
      "Common Core 7.RP.A.1",
      "California 6.RP.3",
    ]);
  });
});

describe("mergeGradeRepeats", () => {
  const row = (id: string, grade: string, code = "WHST.6-8.2d") => ({
    id,
    framework: "Common Core",
    code,
    description: "Use precise language.",
    grade,
  });

  it("merges one standard listed per grade into a span", () => {
    expect(mergeGradeRepeats([row("a", "6"), row("b", "8"), row("c", "7")])).toEqual([row("a", "6-8")]);
  });

  it("spans grade bands and kindergarten", () => {
    expect(mergeGradeRepeats([row("a", "9-10"), row("b", "11-12")])[0].grade).toBe("9-12");
    expect(mergeGradeRepeats([row("a", "1"), row("b", "K")])[0].grade).toBe("K-1");
  });

  it("keeps different standards apart", () => {
    expect(mergeGradeRepeats([row("a", "6"), row("b", "6", "WHST.6-8.2e")])).toHaveLength(2);
  });
});

describe("gradeLabel", () => {
  it("reads grades and spans", () => {
    expect(gradeLabel("6")).toBe("Grade 6");
    expect(gradeLabel("K")).toBe("Kindergarten");
    expect(gradeLabel("6-8")).toBe("Grades 6–8");
  });
});
