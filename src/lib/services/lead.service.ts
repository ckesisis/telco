import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import { findCustomerByPhone, createCustomer } from "@/lib/services/customer.service";
import { pickDistributedAgent } from "@/lib/services/lead-distribution.service";
import { isMetaChannel } from "@/config/source-channels";
import {
  EMPTY_ATTRIBUTION,
  readLeadAttribution,
} from "@/lib/lead-attribution";

export async function listLeads(
  organizationId: string,
  ctx: ApiContext,
  filters?: { status?: string; search?: string }
) {
  return db.lead.findMany({
    where: {
      organizationId,
      ...(filters?.status && { status: filters.status as never }),
      ...(filters?.search && {
        OR: [
          { phone: { contains: filters.search } },
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(ctx.isAdmin
        ? {}
        : {
            OR: [
              { assignedUserId: ctx.userId },
              { assignedUserId: null },
            ],
          }),
    },
    include: {
      source: true,
      assignedUser: true,
      customer: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getLead(organizationId: string, id: string) {
  return db.lead.findFirst({
    where: { id, organizationId },
    include: {
      source: true,
      assignedUser: true,
      customer: true,
      order: true,
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    },
  });
}

async function resolveAssignee(
  organizationId: string,
  ctx: ApiContext,
  sourceId: string,
  explicit?: string | null
) {
  if (explicit) {
    if (!ctx.isAdmin && explicit !== ctx.userId) {
      throw new Error("Δεν μπορείτε να αναθέσετε το lead σε άλλον χρήστη");
    }
    return explicit;
  }

  if (ctx.isAdmin || ctx.userId === "api-key") {
    const distributed = await pickDistributedAgent(organizationId, sourceId);
    if (distributed) return distributed;
  }

  if (ctx.userId === "api-key") return null;
  return ctx.userId;
}

export async function createLead(
  organizationId: string,
  ctx: ApiContext,
  data: {
    phone: string;
    sourceId: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    notes?: string | null;
    assignedUserId?: string | null;
    externalId?: string | null;
    payload?: Record<string, unknown> | null;
  }
) {
  if (data.externalId) {
    const existing = await db.lead.findFirst({
      where: {
        organizationId,
        sourceId: data.sourceId,
        externalId: data.externalId,
      },
    });
    if (existing) return existing;
  }

  const source = await db.source.findFirst({
    where: { id: data.sourceId, organizationId },
  });
  if (!source) throw new Error("Η πηγή δεν βρέθηκε");

  const attribution = isMetaChannel(source.channel)
    ? readLeadAttribution(data as Record<string, unknown>)
    : EMPTY_ATTRIBUTION;

  return db.lead.create({
    data: {
      organizationId,
      phone: data.phone,
      sourceId: data.sourceId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      notes: data.notes,
      ...attribution,
      assignedUserId: await resolveAssignee(
        organizationId,
        ctx,
        data.sourceId,
        data.assignedUserId
      ),
      externalId: data.externalId,
      payload: data.payload ? (data.payload as object) : undefined,
    },
    include: { source: true },
  });
}

export function canAccessLead(
  ctx: ApiContext,
  lead: { assignedUserId: string | null }
) {
  if (ctx.isAdmin) return true;
  return !lead.assignedUserId || lead.assignedUserId === ctx.userId;
}

export async function updateLead(
  organizationId: string,
  ctx: ApiContext,
  id: string,
  data: Record<string, unknown>
) {
  const lead = await getLead(organizationId, id);
  if (!lead || !canAccessLead(ctx, lead)) {
    throw new Error("Το lead δεν βρέθηκε");
  }

  const next: Record<string, unknown> = {};
  if (typeof data.status === "string" && data.status !== "converted") {
    next.status = data.status;
  }
  if (typeof data.notes === "string") next.notes = data.notes;
  if (typeof data.firstName === "string") next.firstName = data.firstName;
  if (typeof data.lastName === "string") next.lastName = data.lastName;
  if (typeof data.email === "string") next.email = data.email;

  return db.lead.update({
    where: { id, organizationId },
    data: next as never,
    include: { source: true, customer: true },
  });
}

export async function convertLead(
  organizationId: string,
  ctx: ApiContext,
  leadId: string
) {
  const lead = await getLead(organizationId, leadId);
  if (!lead) throw new Error("Lead not found");
  if (lead.status === "converted") throw new Error("Lead already converted");

  let customer = lead.customer;
  if (!customer) {
    const existing = await findCustomerByPhone(organizationId, lead.phone);
    if (existing) {
      customer = existing;
    } else {
      customer = await createCustomer(organizationId, {
        firstName: lead.firstName ?? "Άγνωστο",
        lastName: lead.lastName ?? "",
        contactPhone: lead.phone,
        sourceId: lead.sourceId,
      });
    }
  }

  const updated = await db.lead.update({
    where: { id: leadId },
    data: {
      status: "converted",
      customerId: customer.id,
    },
    include: { customer: true, source: true },
  });

  return { lead: updated, customer };
}

export async function importLeads(
  organizationId: string,
  ctx: ApiContext,
  sourceId: string,
  rows: Array<{
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    notes?: string;
    externalId?: string;
    campaignName?: string;
    adsetName?: string;
    adName?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  }>
) {
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const [index, row] of rows.entries()) {
    try {
      if (!row.phone) {
        results.errors.push(`Row ${index + 1}: missing phone`);
        continue;
      }

      if (row.externalId) {
        const existing = await db.lead.findFirst({
          where: { organizationId, sourceId, externalId: row.externalId },
        });
        if (existing) {
          results.skipped++;
          continue;
        }
      } else {
        const existing = await db.lead.findFirst({
          where: { organizationId, sourceId, phone: row.phone, status: { not: "lost" } },
        });
        if (existing) {
          results.skipped++;
          continue;
        }
      }

      await createLead(organizationId, ctx, {
        ...row,
        sourceId,
        payload: { importRow: index + 1 },
      });
      results.created++;
    } catch (err) {
      results.errors.push(
        `Row ${index + 1}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return results;
}
