/** Wrong PINs in a row before a student has to wait */
export const PIN_TRIES_BEFORE_WAIT = 5;
/** How long that wait lasts */
export const PIN_WAIT_MINUTES = 15;
/** Wrong PINs in a row before only a new PIN from the teacher helps */
export const PIN_TRIES_BEFORE_LOCK = 10;

export type PinBlock = "wait" | "locked";

/** Why a student can't try a PIN right now, or null when they can. */
export function pinBlock(
  student: { failedPinAttempts: number; pinLockedUntil: Date | null },
  now = new Date()
): PinBlock | null {
  if (student.failedPinAttempts >= PIN_TRIES_BEFORE_LOCK) return "locked";
  if (student.pinLockedUntil && student.pinLockedUntil > now) return "wait";
  return null;
}

/**
 * After the `attempt`-th wrong PIN in a row: whether the student is now locked
 * out, has to wait (and until when), or can simply try again.
 */
export function afterWrongPin(attempt: number, now = new Date()): { block: PinBlock | null; lockUntil: Date | null } {
  if (attempt >= PIN_TRIES_BEFORE_LOCK) return { block: "locked", lockUntil: null };
  if (attempt % PIN_TRIES_BEFORE_WAIT === 0) {
    return { block: "wait", lockUntil: new Date(now.getTime() + PIN_WAIT_MINUTES * 60_000) };
  }
  return { block: null, lockUntil: null };
}

/** What a student sees when sign-in is refused. */
export function pinMessage(code: string | undefined): string {
  if (code === "pin_locked") return "Too many wrong PINs. Ask your teacher for a new PIN.";
  if (code === "pin_wait") return `Too many wrong PINs. Wait ${PIN_WAIT_MINUTES} minutes, or ask your teacher for a new PIN.`;
  return "That PIN doesn't match. Try again or ask your teacher.";
}
