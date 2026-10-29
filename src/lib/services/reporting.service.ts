import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import type { Prisma } from "@/generated/prisma/client";
import { normalizePhone } from "@/lib/phone";
import { listCallRowsInRange, type CallHistoryRow } from "@/lib/services/call-history";
import { getMemberProfiles, listSources } from "@/lib/services/catalog.service";
import { listLeadCampaigns } from "@/lib/services/lead.service";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import {
  addDays,
  athensDay,
  currentRange,
  dayDiff,
  previousDays,
  weekStart,
  labelDay,
  type DateRange,
  type ReportFilters,
} from "@/lib/reporting/filters";

/** Value for the agent filter that selects leads with no assigned agent. */
export const UNASSIGNED = "unassigned";

/** A lead counts as "called" if the first outgoing call happens within this window. */
const SPEED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_DAYS = 7;

const APP_TYPE_LABELS: Record<string, string> = {
  new_number: "Νέος αριθμός",
  portability: "Φορητότητα",
};

// ---------------------------------------------------------------------------
// Scope helpers

function agentScope(ctx: ApiContext, filters: ReportFilters): Prisma.LeadWhereInput {
  if (!ctx.isAdmin) return { assignedUserId: ctx.userId };
  if (filters.agentId === UNASSIGNED) return { assignedUserId: null };
  if (filters.agentId) return { assignedUserId: filters.agentId };
  return {};
}

function leadBaseWhere(ctx: ApiContext, filters: ReportFilters): Prisma.LeadWhereInput {
  return {
    organizationId: ctx.organizationId,
    ...agentScope(ctx, filters),
    ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
    ...(filters.campaign ? { campaignName: filters.campaign } : {}),
  };
}

function leadCohortWhere(ctx: ApiContext, filters: ReportFilters, range: DateRange): Prisma.LeadWhereInput {
  return { ...leadBaseWhere(ctx, filters), createdAt: { gte: range.from, lte: range.to } };
}

function appFilter(filters: ReportFilters, success = false): Prisma.ApplicationWhereInput {
  return {
    isGift: false,
    ...(filters.productLine ? { productLine: filters.productLine } : {}),
    ...(success ? { status: { isSuccess: true } } : {}),
  };
}

/** A sale = lead in the converted stage ("Μετατράπηκε"). */
function converted(where: Prisma.LeadWhereInput): Prisma.LeadWhereInput {
  return { ...where, status: { isConverted: true } };
}

function withApplication(where: Prisma.LeadWhereInput, filters: ReportFilters, success = false) {
  return { ...where, order: { is: { applications: { some: appFilter(filters, success) } } } };
}

function callScope(rows: CallHistoryRow[], ctx: ApiContext, filters: ReportFilters) {
  if (!ctx.isAdmin) return rows.filter((row) => row.agentUserId === ctx.userId);
  if (filters.agentId === UNASSIGNED) return rows.filter((row) => !row.agentUserId);
  if (filters.agentId) return rows.filter((row) => row.agentUserId === filters.agentId);
  return rows;
}

function inRange(date: Date, range: DateRange) {
  return date >= range.from && date <= range.to;
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Calls

export type CallKpis = {
  total: number;
  incoming: number;
  outgoing: number;
  missed: number;
  answeredIncoming: number;
  answerRate: number;
  talkSeconds: number;
  avgTalkSeconds: number;
  connectedCalls: number;
};

function callKpis(rows: CallHistoryRow[]): CallKpis {
  let incoming = 0;
  let outgoing = 0;
  let missed = 0;
  let missedIncoming = 0;
  let talkSeconds = 0;
  let connectedCalls = 0;
  for (const row of rows) {
    if (row.direction === "incoming") incoming++;
    else outgoing++;
    if (row.status === "missed") {
      missed++;
      if (row.direction === "incoming") missedIncoming++;
    }
    // Missed calls can carry ring time as duration; it isn't talk time.
    if (row.status !== "missed" && row.durationSeconds && row.durationSeconds > 0) {
      talkSeconds += row.durationSeconds;
      connectedCalls++;
    }
  }
  return {
    total: rows.length,
    incoming,
    outgoing,
    missed,
    answeredIncoming: incoming - missedIncoming,
    answerRate: pct(incoming - missedIncoming, incoming),
    talkSeconds,
    avgTalkSeconds: connectedCalls > 0 ? Math.round(talkSeconds / connectedCalls) : 0,
    connectedCalls,
  };
}

// ---------------------------------------------------------------------------
// Speed to lead

type CohortLead = { id: string; phone: string; createdAt: Date; assignedUserId: string | null };

const cohortSelect = {
  id: true,
  phone: true,
  createdAt: true,
  assignedUserId: true,
  status: { select: { isConverted: true } },
} as const;

function outgoingIndex(rows: CallHistoryRow[]) {
  const byLead = new Map<string, number[]>();
  const byPhone = new Map<string, number[]>();
  for (const row of rows) {
    if (row.direction !== "outgoing") continue;
    const time = row.startedAt.getTime();
    if (row.leadId) {
      const list = byLead.get(row.leadId) ?? [];
      list.push(time);
      byLead.set(row.leadId, list);
    }
    const phone = normalizePhone(row.phone).slice(-10);
    if (phone.length === 10) {
      const list = byPhone.get(phone) ?? [];
      list.push(time);
      byPhone.set(phone, list);
    }
  }
  return { byLead, byPhone };
}

/** Minutes from lead creation to the first outgoing call, or null if none within the window. */
function firstCallMinutes(lead: CohortLead, index: ReturnType<typeof outgoingIndex>) {
  const created = lead.createdAt.getTime();
  const phone = normalizePhone(lead.phone).slice(-10);
  const candidates = [...(index.byLead.get(lead.id) ?? []), ...(index.byPhone.get(phone) ?? [])];
  let first: number | null = null;
  for (const time of candidates) {
    if (time >= created && time - created <= SPEED_WINDOW_MS && (first == null || time < first)) {
      first = time;
    }
  }
  return first == null ? null : (first - created) / 60_000;
}

export type SpeedKpis = {
  leads: number;
  called: number;
  medianMinutes: number | null;
  within15Pct: number;
  within60Pct: number;
  within1440Pct: number;
  notCalledPct: number;
};

function speedKpis(minutes: (number | null)[]): SpeedKpis {
  const called = minutes.filter((value): value is number => value != null);
  return {
    leads: minutes.length,
    called: called.length,
    medianMinutes: median(called),
    within15Pct: pct(called.filter((value) => value <= 15).length, minutes.length),
    within60Pct: pct(called.filter((value) => value <= 60).length, minutes.length),
    within1440Pct: pct(called.filter((value) => value <= 1440).length, minutes.length),
    notCalledPct: pct(minutes.length - called.length, minutes.length),
  };
}

// ---------------------------------------------------------------------------
// Headline (computed for both current and previous period)

export type Headline = {
  leads: number;
  /** Leads in the converted stage ("Μετατράπηκε") */
  sales: number;
  saleRate: number;
  /** Leads with an application entered in the CRM */
  applied: number;
  success: number;
  applyRate: number;
  successRate: number;
  calls: CallKpis;
  speed: SpeedKpis;
};

async function headline(
  ctx: ApiContext,
  filters: ReportFilters,
  range: DateRange,
  callRows: CallHistoryRow[],
  index: ReturnType<typeof outgoingIndex>
) {
  const where = leadCohortWhere(ctx, filters, range);
  const [cohort, applied, success] = await Promise.all([
    db.lead.findMany({ where, select: cohortSelect }),
    db.lead.count({ where: withApplication(where, filters) }),
    db.lead.count({ where: withApplication(where, filters, true) }),
  ]);
  const speedMinutes = cohort.map((lead) => firstCallMinutes(lead, index));
  const calls = callRows.filter((row) => inRange(row.startedAt, range));
  const sales = cohort.filter((lead) => lead.status.isConverted).length;
  const result: Headline = {
    leads: cohort.length,
    sales,
    saleRate: pct(sales, cohort.length),
    applied,
    success,
    applyRate: pct(applied, cohort.length),
    successRate: pct(success, cohort.length),
    calls: callKpis(calls),
    speed: speedKpis(speedMinutes),
  };
  return { result, cohort, speedMinutes, calls };
}

// ---------------------------------------------------------------------------
// Breakdowns

export type BreakdownRow = {
  key: string;
  label: string;
  color?: string;
  leads: number;
  sales: number;
  saleRate: number;
  applied: number;
  success: number;
  applyRate: number;
  successRate: number;
};

type GroupKey = "sourceId" | "campaignName" | "assignedUserId";

async function leadBreakdown(
  by: GroupKey,
  where: Prisma.LeadWhereInput,
  filters: ReportFilters,
  label: (key: string | null) => { label: string; color?: string }
): Promise<BreakdownRow[]> {
  const group = (w: Prisma.LeadWhereInput) =>
    db.lead.groupBy({ by: [by], where: w, _count: { _all: true } });
  const [total, sold, applied, success] = await Promise.all([
    group(where),
    group(converted(where)),
    group(withApplication(where, filters)),
    group(withApplication(where, filters, true)),
  ]);
  const keyOf = (row: Record<string, unknown>) => (row[by] as string | null) ?? "";
  const soldMap = new Map(sold.map((row) => [keyOf(row), row._count._all]));
  const appliedMap = new Map(applied.map((row) => [keyOf(row), row._count._all]));
  const successMap = new Map(success.map((row) => [keyOf(row), row._count._all]));
  return total
    .map((row) => {
      const key = keyOf(row);
      const leads = row._count._all;
      const sales = soldMap.get(key) ?? 0;
      const a = appliedMap.get(key) ?? 0;
      const s = successMap.get(key) ?? 0;
      return {
        key: key || "none",
        ...label(key || null),
        leads,
        sales,
        saleRate: pct(sales, leads),
        applied: a,
        success: s,
        applyRate: pct(a, leads),
        successRate: pct(s, leads),
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

export type AppBreakdownRow = { key: string; label: string; apps: number; success: number; successRate: number };

async function appBreakdown(
  by: "productLine" | "applicationType",
  where: Prisma.ApplicationWhereInput,
  labels: Record<string, string>
): Promise<AppBreakdownRow[]> {
  const group = (w: Prisma.ApplicationWhereInput) =>
    db.application.groupBy({ by: [by], where: w, _count: { _all: true } });
  const [total, success] = await Promise.all([
    group(where),
    group({ ...where, status: { isSuccess: true } }),
  ]);
  const keyOf = (row: Record<string, unknown>) => (row[by] as string | null) ?? "";
  const successMap = new Map(success.map((row) => [keyOf(row), row._count._all]));
  return total
    .map((row) => {
      const key = keyOf(row);
      const s = successMap.get(key) ?? 0;
      return {
        key: key || "none",
        label: labels[key] ?? "—",
        apps: row._count._all,
        success: s,
        successRate: pct(s, row._count._all),
      };
    })
    .sort((a, b) => b.apps - a.apps);
}

// ---------------------------------------------------------------------------
// Trend

export type TrendPoint = {
  bucket: string;
  label: string;
  leads: number;
  /** Converted leads, bucketed by the lead's creation date */
  sales: number;
  applications: number;
  successApplications: number;
  incoming: number;
  outgoing: number;
  missed: number;
};

export type TrendGranularity = "day" | "week" | "month";

const MONTH_LABELS = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

function addMonths(ymd: string, months: number) {
  const [year, month] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

function trendBuckets(filters: ReportFilters) {
  const days = dayDiff(filters.from, filters.to) + 1;
  const granularity: TrendGranularity = days <= 62 ? "day" : days <= 190 ? "week" : "month";
  const bucketOf = (day: string) =>
    granularity === "day" ? day : granularity === "week" ? weekStart(day) : `${day.slice(0, 7)}-01`;
  const keyOf = (date: Date) => bucketOf(athensDay(date));
  const points = new Map<string, TrendPoint>();
  let cursor = bucketOf(filters.from);
  while (cursor <= filters.to) {
    const [year, month, day] = cursor.split("-").map(Number);
    points.set(cursor, {
      bucket: cursor,
      label:
        granularity === "month" ? `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}` : `${day}/${month}`,
      leads: 0,
      sales: 0,
      applications: 0,
      successApplications: 0,
      incoming: 0,
      outgoing: 0,
      missed: 0,
    });
    cursor = granularity === "month" ? addMonths(cursor, 1) : addDays(cursor, granularity === "week" ? 7 : 1);
  }
  return { granularity, keyOf, points };
}

// ---------------------------------------------------------------------------
// Leaderboard

export type AgentRow = {
  userId: string;
  name: string;
  leads: number;
  sales: number;
  saleRate: number;
  applied: number;
  success: number;
  successRate: number;
  calls: number;
  outgoing: number;
  missed: number;
  talkSeconds: number;
  medianSpeedMinutes: number | null;
};

// ---------------------------------------------------------------------------
// Main entry point

export type ReportData = Awaited<ReturnType<typeof getReport>>;

export async function getReport(ctx: ApiContext, filters: ReportFilters) {
  const organizationId = ctx.organizationId;
  const range = currentRange(filters);
  const prevDays = previousDays(filters);
  const prevRange = currentRange(prevDays);
  const now = new Date();

  // One call fetch covers both periods plus the speed-to-lead window.
  const callsTo = new Date(Math.min(now.getTime(), range.to.getTime() + SPEED_WINDOW_MS));
  const [allCallRows, members, sources, stages, campaigns] = await Promise.all([
    listCallRowsInRange(organizationId, prevRange.from, callsTo),
    getMemberProfiles(organizationId),
    listSources(organizationId),
    db.leadStage.findMany({ where: { organizationId }, orderBy: { sortOrder: "asc" } }),
    listLeadCampaigns(organizationId, ctx),
  ]);
  // Speed to lead counts a call by anyone; KPIs only count calls in scope.
  const index = outgoingIndex(allCallRows);
  const scopedCalls = callScope(allCallRows, ctx, filters);

  const memberName = new Map(members.map((m) => [m.userId, m.user.name || m.user.email]));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const stageInfo = new Map(stages.map((s) => [s.id, s]));

  const cohortWhere = leadCohortWhere(ctx, filters, range);
  const baseWhere = leadBaseWhere(ctx, filters);
  const appWhere: Prisma.ApplicationWhereInput = {
    organizationId,
    ...appFilter(filters),
    order: { lead: { is: cohortWhere } },
  };
  const openStage = { status: { isClosed: false, isConverted: false } };
  const staleBefore = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const [
    current,
    previous,
    bySource,
    byCampaign,
    byAgent,
    byStage,
    byProductLine,
    byAppType,
    openLeads,
    closedLeads,
    overdueCallbacks,
    staleLeads,
    unassignedOpen,
    trendApps,
  ] = await Promise.all([
    headline(ctx, filters, range, scopedCalls, index),
    headline(ctx, filters, prevRange, scopedCalls, index),
    leadBreakdown("sourceId", cohortWhere, filters, (key) => ({
      label: key ? sourceName.get(key) ?? "—" : "—",
    })),
    leadBreakdown("campaignName", cohortWhere, filters, (key) => ({ label: key ?? "Χωρίς campaign" })),
    leadBreakdown("assignedUserId", cohortWhere, filters, (key) => ({
      label: key ? memberName.get(key) ?? "—" : "Χωρίς ανάθεση",
    })),
    db.lead.groupBy({ by: ["statusId"], where: cohortWhere, _count: { _all: true } }),
    appBreakdown("productLine", appWhere, PRODUCT_LINE_LABELS),
    appBreakdown("applicationType", appWhere, APP_TYPE_LABELS),
    db.lead.count({ where: { ...baseWhere, ...openStage } }),
    db.lead.count({ where: { ...baseWhere, status: { OR: [{ isClosed: true }, { isConverted: true }] } } }),
    db.lead.count({ where: { ...baseWhere, ...openStage, callbackAt: { lt: now } } }),
    db.lead.count({ where: { ...baseWhere, ...openStage, updatedAt: { lt: staleBefore } } }),
    ctx.isAdmin && !filters.agentId
      ? db.lead.count({ where: { ...baseWhere, ...openStage, assignedUserId: null } })
      : Promise.resolve(0),
    db.application.findMany({
      where: {
        organizationId,
        ...appFilter(filters),
        createdAt: { gte: range.from, lte: range.to },
        order: { lead: { is: baseWhere } },
      },
      select: { createdAt: true, status: { select: { isSuccess: true } } },
    }),
  ]);

  // Trend
  const trend = trendBuckets(filters);
  const bump = (date: Date, field: keyof Omit<TrendPoint, "bucket" | "label">) => {
    const point = trend.points.get(trend.keyOf(date));
    if (point) point[field]++;
  };
  for (const lead of current.cohort) {
    bump(lead.createdAt, "leads");
    if (lead.status.isConverted) bump(lead.createdAt, "sales");
  }
  for (const app of trendApps) {
    bump(app.createdAt, "applications");
    if (app.status.isSuccess) bump(app.createdAt, "successApplications");
  }
  for (const row of current.calls) {
    bump(row.startedAt, row.direction === "incoming" ? "incoming" : "outgoing");
    if (row.status === "missed") bump(row.startedAt, "missed");
  }

  // Calls per agent
  const callsByAgent = new Map<string, CallHistoryRow[]>();
  for (const row of current.calls) {
    const key = row.agentUserId ?? "";
    const list = callsByAgent.get(key) ?? [];
    list.push(row);
    callsByAgent.set(key, list);
  }
  const callAgentRows = [...callsByAgent.entries()]
    .map(([userId, rows]) => ({
      key: userId || "none",
      label: userId ? memberName.get(userId) ?? rows[0]?.agentName ?? "—" : "Άγνωστη γραμμή",
      ...callKpis(rows),
    }))
    .sort((a, b) => b.total - a.total);

  // Leaderboard (admins only)
  let leaderboard: AgentRow[] | null = null;
  if (ctx.isAdmin) {
    const speedByAgent = new Map<string, number[]>();
    current.cohort.forEach((lead, i) => {
      const minutes = current.speedMinutes[i];
      if (!lead.assignedUserId || minutes == null) return;
      const list = speedByAgent.get(lead.assignedUserId) ?? [];
      list.push(minutes);
      speedByAgent.set(lead.assignedUserId, list);
    });
    const leadStats = new Map(byAgent.map((row) => [row.key, row]));
    const ids = new Set<string>([
      ...byAgent.map((row) => row.key).filter((key) => key !== "none"),
      ...[...callsByAgent.keys()].filter(Boolean),
    ]);
    leaderboard = [...ids]
      .map((userId) => {
        const leadsRow = leadStats.get(userId);
        const calls = callKpis(callsByAgent.get(userId) ?? []);
        return {
          userId,
          name: memberName.get(userId) ?? "—",
          leads: leadsRow?.leads ?? 0,
          sales: leadsRow?.sales ?? 0,
          saleRate: leadsRow?.saleRate ?? 0,
          applied: leadsRow?.applied ?? 0,
          success: leadsRow?.success ?? 0,
          successRate: leadsRow?.successRate ?? 0,
          calls: calls.total,
          outgoing: calls.outgoing,
          missed: calls.missed,
          talkSeconds: calls.talkSeconds,
          medianSpeedMinutes: median(speedByAgent.get(userId) ?? []),
        };
      })
      .sort((a, b) => b.sales - a.sales || b.saleRate - a.saleRate || b.leads - a.leads);
  }

  const agents = members
    .map((m) => ({ id: m.userId, name: m.user.name || m.user.email }))
    .sort((a, b) => a.name.localeCompare(b.name, "el"));

  return {
    filters,
    generatedAt: now.toISOString(),
    period: {
      label: `${labelDay(filters.from)} – ${labelDay(filters.to)}`,
      previousLabel: `${labelDay(prevDays.from)} – ${labelDay(prevDays.to)}`,
    },
    /** Applications aren't entered in the CRM yet; hide application metrics until they are. */
    hasApplications: current.result.applied + previous.result.applied + trendApps.length > 0,
    current: current.result,
    previous: previous.result,
    leads: {
      bySource,
      byCampaign,
      byAgent,
      byStage: byStage
        .map((row) => {
          const stage = stageInfo.get(row.statusId);
          return {
            key: row.statusId,
            label: stage?.name ?? "—",
            color: stage?.color,
            sortOrder: stage?.sortOrder ?? 0,
            count: row._count._all,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
      pipeline: {
        open: openLeads,
        closed: closedLeads,
        overdueCallbacks,
        stale: staleLeads,
        unassignedOpen,
        staleDays: STALE_DAYS,
      },
    },
    conversion: { byProductLine, byAppType },
    calls: { byAgent: callAgentRows },
    trend: { granularity: trend.granularity, points: [...trend.points.values()] },
    leaderboard,
    options: {
      agents: ctx.isAdmin ? agents : [],
      sources: sources.map((s) => ({ id: s.id, name: s.name })),
      campaigns,
    },
  };
}
