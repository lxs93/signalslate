/**
 * Quotes one CSV cell. Text starting with = + - @ (or a tab/CR) is prefixed
 * with ' so spreadsheets show student answers instead of running them as formulas.
 */
function cell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // CRLF and a BOM so Excel opens accented names correctly
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
