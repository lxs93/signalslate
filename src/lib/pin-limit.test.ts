import { describe, expect, it } from "vitest";
import { afterWrongPin, pinBlock, pinMessage } from "./pin-limit";

const now = new Date("2026-11-24T10:00:00Z");

describe("pinBlock", () => {
  it("lets a student try when nothing is in the way", () => {
    expect(pinBlock({ failedPinAttempts: 4, pinLockedUntil: null }, now)).toBeNull();
    expect(pinBlock({ failedPinAttempts: 5, pinLockedUntil: new Date("2026-11-24T09:59:00Z") }, now)).toBeNull();
  });

  it("makes them wait until the lock runs out", () => {
    expect(pinBlock({ failedPinAttempts: 5, pinLockedUntil: new Date("2026-11-24T10:05:00Z") }, now)).toBe("wait");
  });

  it("locks them out after 10 wrong PINs, whatever the time", () => {
    expect(pinBlock({ failedPinAttempts: 10, pinLockedUntil: null }, now)).toBe("locked");
  });
});

describe("afterWrongPin", () => {
  it("allows another try below 5", () => {
    expect(afterWrongPin(4, now)).toEqual({ block: null, lockUntil: null });
  });

  it("starts a 15-minute wait at 5", () => {
    expect(afterWrongPin(5, now)).toEqual({ block: "wait", lockUntil: new Date("2026-11-24T10:15:00Z") });
    expect(afterWrongPin(6, now).block).toBeNull();
  });

  it("locks out at 10", () => {
    expect(afterWrongPin(10, now)).toEqual({ block: "locked", lockUntil: null });
  });
});

describe("pinMessage", () => {
  it("explains each case", () => {
    expect(pinMessage("pin_locked")).toMatch(/new PIN/);
    expect(pinMessage("pin_wait")).toMatch(/Wait 15 minutes/);
    expect(pinMessage("credentials")).toMatch(/doesn't match/);
  });
});
