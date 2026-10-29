import type { ProductLine } from "@/generated/prisma/client";
import { PRODUCT_LINES } from "@/config/product-lines";

export const REPORT_TIME_ZONE = "Europe/Athens";

export const REPORT_PRESETS = {
  today: "Σήμερα",
  yesterday: "Χθες",
  week: "Αυτή η εβδομάδα",
  last_week: "Προηγούμενη εβδομάδα",
  month: "Αυτός ο μήνας",
  last_month: "Προηγούμενος μήνας",
  quarter: "Αυτό το τρίμηνο",
  last_quarter: "Προηγούμενο τρίμηνο",
  year: "Φέτος",
  last_year: "Πέρσι",
  last_7: "Τελευταίες 7 ημέρες",
  last_30: "Τελευταίες 30 ημέρες",
  last_90: "Τελευταίες 90 ημέρες",
  custom: "Προσαρμοσμένο",
} as const;

export type ReportPreset = keyof typeof REPORT_PRESETS;
export type ReportTab = "leads" | "conversion" | "calls";

export type ReportFilters = {
  preset: ReportPreset;
  /** YYYY-MM-DD, inclusive, in Athens time */
  from: string;
  to: string;
  agentId: string;
  sourceId: string;
  campaign: string;
  productLine: ProductLine | "";
  tab: ReportTab;
};

export type DateRange = { from: Date; to: Date };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function offsetMs(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: REPORT_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Calendar day (YYYY-MM-DD) of an instant, in Athens time. */
export function athensDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function ymdParts(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

/** Midnight in Athens at the start of the given calendar day. */
export function athensDayStart(ymd: string) {
  const { year, month, day } = ymdParts(ymd);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const guess = utcMidnight - offsetMs(new Date(utcMidnight));
  return new Date(utcMidnight - offsetMs(new Date(guess)));
}

export function addDays(ymd: string, days: number) {
  const { year, month, day } = ymdParts(ymd);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Days between two YYYY-MM-DD values (b - a). */
export function dayDiff(a: string, b: string) {
  const pa = ymdParts(a);
  const pb = ymdParts(b);
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000
  );
}

/** Monday of the week containing the day. */
export function weekStart(ymd: string) {
  const { year, month, day } = ymdParts(ymd);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(ymd, -((weekday + 6) % 7));
}

function quarterStart(ymd: string) {
  const { year, month } = ymdParts(ymd);
  const first = Math.floor((month - 1) / 3) * 3 + 1;
  return `${year}-${String(first).padStart(2, "0")}-01`;
}

/**
 * Day range for a preset. `today` is the current Athens day (YYYY-MM-DD) so the
 * client can compute the same ranges as the server.
 */
export function presetRange(preset: Exclude<ReportPreset, "custom">, today = athensDay(new Date())) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case "week":
      return { from: weekStart(today), to: today };
    case "last_week": {
      const start = addDays(weekStart(today), -7);
      return { from: start, to: addDays(start, 6) };
    }
    case "last_month": {
      const end = addDays(monthStart, -1);
      return { from: `${end.slice(0, 7)}-01`, to: end };
    }
    case "quarter":
      return { from: quarterStart(today), to: today };
    case "last_quarter": {
      const end = addDays(quarterStart(today), -1);
      return { from: quarterStart(end), to: end };
    }
    case "year":
      return { from: yearStart, to: today };
    case "last_year": {
      const year = Number(today.slice(0, 4)) - 1;
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case "last_7":
      return { from: addDays(today, -6), to: today };
    case "last_30":
      return { from: addDays(today, -29), to: today };
    case "last_90":
      return { from: addDays(today, -89), to: today };
    case "month":
    default:
      return { from: monthStart, to: today };
  }
}

type RawParams = Record<string, string | string[] | undefined>;

function single(params: RawParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseReportFilters(params: RawParams, ctx: { isAdmin: boolean }): ReportFilters {
  const rawPreset = single(params, "preset");
  let from = single(params, "from");
  let to = single(params, "to");
  const hasCustom = YMD.test(from) || YMD.test(to);
  let preset: ReportPreset =
    rawPreset in REPORT_PRESETS ? (rawPreset as ReportPreset) : hasCustom ? "custom" : "month";

  if (preset === "custom") {
    const today = athensDay(new Date());
    const fallback = presetRange("month", today);
    if (!YMD.test(from)) from = YMD.test(to) ? to : fallback.from;
    if (!YMD.test(to)) to = today;
    if (to < from) [from, to] = [to, from];
    if (to > today) to = today;
    if (from > today) from = today;
    // Keep queries bounded: at most ~2 years.
    if (dayDiff(from, to) > 731) from = addDays(to, -731);
  } else {
    ({ from, to } = presetRange(preset));
  }
  if (!from || !to) preset = "month";

  const productLine = single(params, "productLine");
  const tab = single(params, "tab");

  return {
    preset,
    from,
    to,
    agentId: ctx.isAdmin ? single(params, "agentId") : "",
    sourceId: single(params, "sourceId"),
    campaign: single(params, "campaign"),
    productLine: (PRODUCT_LINES as string[]).includes(productLine) ? (productLine as ProductLine) : "",
    tab: tab === "conversion" || tab === "calls" ? tab : "leads",
  };
}

export function searchParamsToRecord(params: URLSearchParams): RawParams {
  const record: RawParams = {};
  for (const key of new Set(params.keys())) record[key] = params.getAll(key);
  return record;
}

/** Instants for the filter's inclusive day range: [from 00:00, to+1 00:00). */
export function currentRange(filters: Pick<ReportFilters, "from" | "to">): DateRange {
  return {
    from: athensDayStart(filters.from),
    to: new Date(athensDayStart(addDays(filters.to, 1)).getTime() - 1),
  };
}

/** Same-length window immediately before the current one. */
export function previousDays(filters: Pick<ReportFilters, "from" | "to">) {
  const length = dayDiff(filters.from, filters.to) + 1;
  return { from: addDays(filters.from, -length), to: addDays(filters.from, -1) };
}

export function reportHref(
  filters: Partial<ReportFilters>,
  path = "/reporting"
) {
  const params = new URLSearchParams();
  if (filters.tab && filters.tab !== "leads") params.set("tab", filters.tab);
  if (filters.preset && filters.preset !== "month") params.set("preset", filters.preset);
  if (filters.preset === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.sourceId) params.set("sourceId", filters.sourceId);
  if (filters.campaign) params.set("campaign", filters.campaign);
  if (filters.productLine) params.set("productLine", filters.productLine);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function labelDay(ymd: string) {
  const { year, month, day } = ymdParts(ymd);
  return `${day}/${month}/${year}`;
}
