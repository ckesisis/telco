// Contract end dates are stored as the first day (UTC) of the month.

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function parseMonth(value: string | null | undefined): Date | null {
  const match = value?.trim().match(MONTH_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function nextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/** `YYYY-MM` for `<input type="month">` and URLs. */
export function toMonthValue(date: Date | null | undefined) {
  if (!date) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** `MM/YYYY` for display. */
export function formatMonth(date: Date | null | undefined) {
  if (!date) return "—";
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

/** Turns `YYYY-MM` (from) and `YYYY-MM` (to, inclusive) into a date range filter. */
export function monthRange(from?: string, to?: string) {
  const start = parseMonth(from);
  const end = parseMonth(to);
  if (!start && !end) return null;
  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: nextMonth(end) } : {}),
  };
}
