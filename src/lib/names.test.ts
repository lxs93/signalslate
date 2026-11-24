import { describe, expect, it } from "vitest";
import { byFirstName, byLastName, compareNames } from "./names";

const s = (firstName: string, lastName: string) => ({ firstName, lastName });

describe("byLastName", () => {
  it("ignores case and accents, and sorts one-name students by that name", () => {
    const names = [s("Bao", "Nguyen"), s("Ana", "de la Cruz"), s("Mo", ""), s("Alexandria", "Montgomery"), s("Émile", "Zola"), s("Ava", "Évora")];
    expect(names.sort(byLastName).map((n) => n.lastName || n.firstName)).toEqual([
      "de la Cruz",
      "Évora",
      "Mo",
      "Montgomery",
      "Nguyen",
      "Zola",
    ]);
  });

  it("breaks ties on first name", () => {
    expect([s("Zoe", "Kim"), s("Alex", "Kim")].sort(byLastName).map((n) => n.firstName)).toEqual(["Alex", "Zoe"]);
  });
});

describe("byFirstName", () => {
  it("sorts by first name, then last", () => {
    expect([s("ana", "B"), s("Ana", "A"), s("Ben", "A")].sort(byFirstName)).toEqual([s("Ana", "A"), s("ana", "B"), s("Ben", "A")]);
  });
});

describe("compareNames", () => {
  it("ignores case", () => {
    expect(["mo", "Lily", "aisha"].sort(compareNames)).toEqual(["aisha", "Lily", "mo"]);
  });
});
