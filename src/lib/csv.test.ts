import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

const body = (csv: string) => csv.replace(/^﻿/, "");

describe("toCsv", () => {
  it("starts with a BOM and ends rows with CRLF", () => {
    const csv = toCsv([["a", "b"], ["c", "d"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(body(csv)).toBe('"a","b"\r\n"c","d"\r\n');
  });

  it("escapes quotes, commas and newlines", () => {
    expect(body(toCsv([['say "hi"', "a,b", "line\nbreak"]]))).toBe(
      '"say ""hi""","a,b","line\nbreak"\r\n'
    );
  });

  it("stops spreadsheets running student text as formulas", () => {
    const out = body(toCsv([["=SUM(A1)", "+1", "-2 apples", "@cmd", "\tx", "fine"]]));
    expect(out).toBe(`"'=SUM(A1)","'+1","'-2 apples","'@cmd","'\tx","fine"\r\n`);
  });

  it("leaves numbers alone and blanks out null", () => {
    expect(body(toCsv([[-3, 0, null, undefined]]))).toBe('"-3","0","",""\r\n');
  });
});
