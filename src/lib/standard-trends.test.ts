import { describe, expect, it } from "vitest";
import { summarizeStandardTrends, type TicketForStandards } from "./standard-trends";

const rp1 = { standardId: "s1", code: "6.RP.A.1", framework: "Common Core", description: "Ratios." };
const nf1 = { standardId: "s2", code: "5.NF.A.1", framework: "Common Core", description: "Fractions." };
const custom = { standardId: null, code: "District M6-4", framework: null, description: null };

const ticket = (over: Partial<TicketForStandards>): TicketForStandards => ({
  id: "t",
  title: "T",
  standards: [],
  correct: 0,
  marked: 0,
  themes: [],
  openFlags: 0,
  ...over,
});

describe("summarizeStandardTrends", () => {
  it("adds up every ticket tagged with a standard", () => {
    const [row] = summarizeStandardTrends([
      ticket({ id: "a", title: "A", standards: [rp1], correct: 7, marked: 11, themes: ["part to whole"], openFlags: 2 }),
      ticket({ id: "b", title: "B", standards: [rp1], correct: 9, marked: 9, themes: ["part to whole", "unit rate"], openFlags: 1 }),
    ]);
    expect(row).toMatchObject({
      code: "6.RP.A.1",
      tickets: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      correct: 16,
      marked: 20,
      percentCorrect: 80,
      openFlags: 3,
      topThemes: ["part to whole", "unit rate"],
    });
  });

  it("puts the lowest share correct first and unmarked standards last", () => {
    const rows = summarizeStandardTrends([
      ticket({ id: "a", standards: [rp1], correct: 9, marked: 10 }),
      ticket({ id: "b", standards: [nf1], correct: 4, marked: 10 }),
      ticket({ id: "c", standards: [custom], openFlags: 5 }),
    ]);
    expect(rows.map((r) => [r.code, r.percentCorrect])).toEqual([
      ["5.NF.A.1", 40],
      ["6.RP.A.1", 90],
      ["District M6-4", null],
    ]);
  });

  it("groups custom codes regardless of case", () => {
    const rows = summarizeStandardTrends([
      ticket({ id: "a", standards: [custom] }),
      ticket({ id: "b", standards: [{ ...custom, code: "district m6-4" }] }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].tickets).toHaveLength(2);
  });
});
