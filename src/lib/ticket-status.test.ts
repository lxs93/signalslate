import { describe, expect, it } from "vitest";
import { formatCloseTime, isOpenNow, nextTimeAt } from "./ticket-status";

const now = new Date(2026, 10, 24, 13, 0);

describe("isOpenNow", () => {
  it("follows the open switch when there's no close time", () => {
    expect(isOpenNow({ isOpen: true, closesAt: null }, now)).toBe(true);
    expect(isOpenNow({ isOpen: false, closesAt: null }, now)).toBe(false);
  });

  it("closes once the close time arrives", () => {
    expect(isOpenNow({ isOpen: true, closesAt: new Date(2026, 10, 24, 13, 30) }, now)).toBe(true);
    expect(isOpenNow({ isOpen: true, closesAt: new Date(2026, 10, 24, 13, 0) }, now)).toBe(false);
    expect(isOpenNow({ isOpen: true, closesAt: new Date(2026, 10, 24, 12, 0) }, now)).toBe(false);
  });
});

describe("nextTimeAt", () => {
  it("picks today when the time is still ahead", () => {
    expect(nextTimeAt("14:45", now)).toEqual(new Date(2026, 10, 24, 14, 45));
  });

  it("rolls to tomorrow when the time has passed", () => {
    expect(nextTimeAt("08:15", now)).toEqual(new Date(2026, 10, 25, 8, 15));
    expect(nextTimeAt("13:00", now)).toEqual(new Date(2026, 10, 25, 13, 0));
  });

  it("rejects times it can't read", () => {
    expect(nextTimeAt("25:00", now)).toBeNull();
    expect(nextTimeAt("soon", now)).toBeNull();
  });
});

describe("formatCloseTime", () => {
  it("shows just the time for today and adds the date otherwise", () => {
    expect(formatCloseTime(new Date(2026, 10, 24, 14, 45), now)).toBe("2:45 PM");
    expect(formatCloseTime(new Date(2026, 10, 25, 8, 5), now)).toBe("Nov 25, 8:05 AM");
  });
});
