import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

export type CallHistoryStatus = "ringing" | "active" | "missed" | "completed";

export type CallHistoryRow = {
  id: string;
  startedAt: Date;
  direction: "incoming" | "outgoing";
  phone: string;
  line: string;
  agentName: string | null;
  agentUserId: string | null;
  status: CallHistoryStatus;
  durationSeconds: number | null;
  contactName: string | null;
  customerId: string | null;
  leadId: string | null;
};

type Payload = Record<string, unknown>;

function text(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function epochMs(value: unknown) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function payloadOf(value: unknown): Payload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Payload;
}

function directionOf(payload: Payload): "incoming" | "outgoing" {
  const direction = text(payload.direction);
  if (direction === "incoming" || direction === "outgoing") return direction;
  return text(payload.event).startsWith("incoming") ? "incoming" : "outgoing";
}

function statusOf(payloads: Payload[]): CallHistoryStatus {
  const events = payloads.map((payload) => text(payload.event));
  const states = payloads.map((payload) => text(payload.state));
  if (states.includes("missed")) return "missed";
  if (events.some((event) => event.endsWith("_finished"))) return "completed";
  if (
    events.includes("incoming_answered") ||
    payloads.some((payload) => epochMs(payload.answered_at_ms))
  ) {
    return "active";
  }
  if (events.includes("incoming_ringing")) return "ringing";
  return "active";
}

function durationOf(payloads: Payload[]) {
  for (const payload of payloads) {
    const talk = Number(text(payload.talk_duration_seconds));
    if (Number.isFinite(talk) && talk > 0) return Math.round(talk);
  }
  const ended = payloads.map((payload) => epochMs(payload.ended_at_ms)).find(Boolean) ?? null;
  const answered = payloads.map((payload) => epochMs(payload.answered_at_ms)).find(Boolean) ?? null;
  const started = payloads.map((payload) => epochMs(payload.started_at_ms)).find(Boolean) ?? null;
  const from = answered ?? started;
  if (!ended || !from || ended < from) return null;
  return Math.round((ended - from) / 1000);
}

function personName(firstName?: string | null, lastName?: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

const SEARCH_LABELS: Record<CallHistoryStatus | "incoming" | "outgoing", string> = {
  ringing: "χτυπάει",
  active: "σε εξέλιξη",
  missed: "αναπάντητη",
  completed: "ολοκληρώθηκε",
  incoming: "εισερχόμενη",
  outgoing: "εξερχόμενη",
};

function matchesQuery(row: CallHistoryRow, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const fields = [
    row.phone,
    row.line,
    row.agentName,
    row.contactName,
    SEARCH_LABELS[row.status],
    SEARCH_LABELS[row.direction],
  ];
  if (fields.some((field) => field?.toLowerCase().includes(needle))) return true;
  const phoneNeedle = normalizePhone(query);
  if (!phoneNeedle) return false;
  return (
    normalizePhone(row.phone).includes(phoneNeedle) ||
    normalizePhone(row.line).includes(phoneNeedle)
  );
}

const callEventInclude = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
} as const;

type LineAgent = { userId: string; name: string | null };

async function agentNames(organizationId: string) {
  const profiles = await db.userProfile.findMany({
    where: { organizationId, contactPhone: { not: null } },
    select: { contactPhone: true, userId: true, user: { select: { name: true } } },
  });
  const agentByPhone = new Map<string, LineAgent>();
  for (const profile of profiles) {
    const phone = normalizePhone(profile.contactPhone ?? "");
    if (phone) agentByPhone.set(phone, { userId: profile.userId, name: profile.user.name || null });
  }
  return agentByPhone;
}

type CallEventRow = Awaited<
  ReturnType<typeof db.callEvent.findMany<{ include: typeof callEventInclude }>>
>[number];

function groupCallEvents(events: CallEventRow[], agentByPhone: Map<string, LineAgent>) {
  const groups = new Map<string, CallEventRow[]>();
  for (const event of events) {
    const payload = payloadOf(event.payload);
    const started = text(payload.started_at_ms);
    const line = normalizePhone(text(payload.msisdn));
    const phone = normalizePhone(text(payload.phone_number) || event.phone);
    const key = started ? `${line}|${phone}|${started}` : event.id;
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const rows: CallHistoryRow[] = [...groups.values()].map((group) => {
    const payloads = group.map((event) => payloadOf(event.payload));
    const latest = payloads[0] ?? {};
    const phone =
      text(latest.phone_number) ||
      group.find((event) => event.phone && event.phone !== "(missing)")?.phone ||
      "—";
    const line = text(latest.msisdn) || "—";
    const startedMs = payloads.map((payload) => epochMs(payload.started_at_ms)).find(Boolean);
    const customer = group.find((event) => event.customer)?.customer ?? null;
    const lead = group.find((event) => event.lead)?.lead ?? null;
    const payloadName = text(latest.name);
    const namedContact =
      personName(customer?.firstName, customer?.lastName) ??
      personName(lead?.firstName, lead?.lastName);
    const contactName =
      namedContact ??
      (payloadName && normalizePhone(payloadName) !== normalizePhone(phone) ? payloadName : null);

    return {
      id: group.map((event) => event.id).sort().join("-"),
      startedAt: startedMs ? new Date(startedMs) : group[group.length - 1].createdAt,
      direction: directionOf(latest),
      phone,
      line,
      agentName: agentByPhone.get(normalizePhone(line))?.name ?? null,
      agentUserId: agentByPhone.get(normalizePhone(line))?.userId ?? null,
      status: statusOf(payloads),
      durationSeconds: durationOf(payloads),
      contactName,
      customerId: customer?.id ?? null,
      leadId: lead?.id ?? null,
    };
  });

  return rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export async function listCallHistoryForPhone(organizationId: string, phone: string) {
  const last10 = normalizePhone(phone).slice(-10);
  if (last10.length < 10) return [];

  const matches = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM call_event
    WHERE "organizationId" = ${organizationId}
    AND (
      right(regexp_replace(COALESCE(payload->>'phone_number', ''), '\\D', '', 'g'), 10) = ${last10}
      OR right(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10) = ${last10}
    )
    ORDER BY "createdAt" DESC
    LIMIT 200
  `;
  if (matches.length === 0) return [];

  const [events, agents] = await Promise.all([
    db.callEvent.findMany({
      where: { id: { in: matches.map((match) => match.id) } },
      orderBy: { createdAt: "desc" },
      include: callEventInclude,
    }),
    agentNames(organizationId),
  ]);

  return groupCallEvents(events, agents);
}

/**
 * Grouped call rows that started within [from, to]. Events are loaded with a
 * small margin so calls that span the boundary are grouped correctly.
 */
export async function listCallRowsInRange(organizationId: string, from: Date, to: Date) {
  const marginMs = 6 * 60 * 60 * 1000;
  const [events, agents] = await Promise.all([
    db.callEvent.findMany({
      where: {
        organizationId,
        createdAt: { gte: new Date(from.getTime() - marginMs), lte: new Date(to.getTime() + marginMs) },
      },
      orderBy: { createdAt: "desc" },
      include: callEventInclude,
    }),
    agentNames(organizationId),
  ]);
  return groupCallEvents(events, agents).filter(
    (row) => row.startedAt >= from && row.startedAt <= to
  );
}

export const CALL_HISTORY_PAGE_SIZE = 25;

const HISTORY_STATUSES = new Set<CallHistoryStatus>(["ringing", "active", "missed", "completed"]);

export type CallHistoryListFilters = {
  query?: string;
  status?: string;
  direction?: string;
  from?: string;
  to?: string;
  page?: number;
};

function dayStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayEnd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function historyStatus(value?: string): CallHistoryStatus | undefined {
  return value && HISTORY_STATUSES.has(value as CallHistoryStatus)
    ? (value as CallHistoryStatus)
    : undefined;
}

function historyDirection(value?: string): CallHistoryRow["direction"] | undefined {
  return value === "incoming" || value === "outgoing" ? value : undefined;
}

export async function listCallHistory(
  organizationId: string,
  filters?: CallHistoryListFilters
) {
  const query = filters?.query?.trim() ?? "";
  const status = historyStatus(filters?.status);
  const direction = historyDirection(filters?.direction);
  const from = filters?.from ? dayStart(filters.from) : null;
  const to = filters?.to ? dayEnd(filters.to) : null;
  const [events, agents] = await Promise.all([
    db.callEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: callEventInclude,
    }),
    agentNames(organizationId),
  ]);

  const rows = groupCallEvents(events, agents).filter((row) => {
    if (!matchesQuery(row, query)) return false;
    if (status && row.status !== status) return false;
    if (direction && row.direction !== direction) return false;
    if (from && row.startedAt < from) return false;
    if (to && row.startedAt > to) return false;
    return true;
  });
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / CALL_HISTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filters?.page ?? 1) || 1), pageCount);
  const calls = rows.slice((page - 1) * CALL_HISTORY_PAGE_SIZE, page * CALL_HISTORY_PAGE_SIZE);
  return { calls, total, page, pageCount };
}
