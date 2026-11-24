/**
 * Whether a ticket takes answers right now: it's open and its automatic
 * close time, if any, hasn't passed.
 */
export function isOpenNow(ticket: { isOpen: boolean; closesAt: Date | null }, now = new Date()): boolean {
  return ticket.isOpen && !(ticket.closesAt && ticket.closesAt <= now);
}

/** "2:45 PM" today, or "Nov 25, 2:45 PM" on another day. */
export function formatCloseTime(closesAt: Date, now = new Date()): string {
  const time = closesAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return closesAt.toDateString() === now.toDateString()
    ? time
    : `${closesAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

/**
 * The next time the clock reads "HH:MM" (24-hour), in the browser's time
 * zone: today if that's still ahead, otherwise tomorrow.
 */
export function nextTimeAt(hhmm: string, now = new Date()): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  if (h > 23 || m > 59) return null;
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return at;
}
