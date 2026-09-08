import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import type { CallKind, Prisma } from "@/generated/prisma/client";
import { normalizePhone, phoneLookupValues } from "@/lib/phone";

const INCOMING_TTL_MS = 90_000;
const ENDED_TTL_MS = 5 * 60_000;

const callInclude = {
  customer: {
    select: { id: true, firstName: true, lastName: true, contactPhone: true },
  },
  lead: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} as const;

async function findRelatedRecords(organizationId: string, phone: string) {
  const phones = phoneLookupValues(phone);

  const customer = await db.customer.findFirst({
    where: { organizationId, contactPhone: { in: phones } },
    select: { id: true, firstName: true, lastName: true, contactPhone: true },
  });

  const lead = customer
    ? await db.lead.findFirst({
        where: { organizationId, customerId: customer.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, phone: true },
      })
    : await db.lead.findFirst({
        where: { organizationId, phone: { in: phones } },
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });

  return { customer, lead };
}

function toJsonPayload(payload: unknown): Prisma.InputJsonValue | undefined {
  if (payload === undefined) return undefined;
  return payload as Prisma.InputJsonValue;
}

export async function recordCallEvent(
  organizationId: string,
  data: {
    kind: CallKind;
    phone: string;
    externalCallId?: string | null;
    durationSeconds?: number | null;
    salesCode?: string | null;
    payload?: unknown;
  }
) {
  const phone = data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  const payload = toJsonPayload(data.payload);

  if (data.externalCallId) {
    const existing = await db.callEvent.findFirst({
      where: {
        organizationId,
        kind: data.kind,
        externalCallId: data.externalCallId,
      },
      include: callInclude,
    });
    if (existing) {
      return db.callEvent.update({
        where: { id: existing.id },
        data: payload !== undefined ? { payload } : {},
        include: callInclude,
      });
    }
  }

  const { customer, lead } = phone
    ? await findRelatedRecords(organizationId, phone)
    : { customer: null, lead: null };

  return db.callEvent.create({
    data: {
      organizationId,
      kind: data.kind,
      phone: phone || "(missing)",
      normalizedPhone: normalizedPhone || "invalid",
      customerId: customer?.id ?? null,
      leadId: lead?.id ?? null,
      externalCallId: data.externalCallId || null,
      durationSeconds: data.durationSeconds ?? null,
      salesCode: data.salesCode || null,
      payload,
    },
    include: callInclude,
  });
}

export async function listPendingCallEvents(ctx: ApiContext) {
  const now = Date.now();
  const events = await db.callEvent.findMany({
    where: {
      organizationId: ctx.organizationId,
      dismissedAt: null,
      createdAt: { gte: new Date(now - ENDED_TTL_MS) },
      NOT: { normalizedPhone: "invalid" },
      ...(ctx.isAdmin
        ? {}
        : {
            OR: [
              { salesCode: null },
              ...(ctx.salesCode ? [{ salesCode: ctx.salesCode }] : []),
            ],
          }),
    },
    include: callInclude,
    omit: { payload: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return events.filter((event) => {
    const age = now - event.createdAt.getTime();
    const ttl = event.kind === "incoming" ? INCOMING_TTL_MS : ENDED_TTL_MS;
    return age <= ttl;
  });
}

export async function listRecentCallEvents(organizationId: string, take = 50) {
  return db.callEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      kind: true,
      phone: true,
      payload: true,
      durationSeconds: true,
      externalCallId: true,
      createdAt: true,
    },
  });
}

export async function dismissCallEvent(organizationId: string, id: string) {
  const event = await db.callEvent.findFirst({
    where: { id, organizationId },
  });
  if (!event) throw new Error("Δεν βρέθηκε η κλήση");

  return db.callEvent.update({
    where: { id },
    data: { dismissedAt: new Date() },
  });
}
