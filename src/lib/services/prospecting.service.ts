import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import { readPreviousProvider } from "@/config/application-types";
import { parseMonth } from "@/lib/prospecting";
import { canAccessLead } from "@/lib/services/lead.service";

export const DEFAULT_PROSPECT_SERVICES = [
  "Σταθερή / Internet",
  "Κινητή συμβόλαιο",
  "Τηλεόραση",
];

export async function seedProspectServices(organizationId: string) {
  const existing = await db.prospectService.count({ where: { organizationId } });
  if (existing > 0) return;
  await db.prospectService.createMany({
    data: DEFAULT_PROSPECT_SERVICES.map((name, index) => ({
      organizationId,
      name,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

export async function listProspectServices(
  organizationId: string,
  options?: { enabledOnly?: boolean }
) {
  await seedProspectServices(organizationId);
  return db.prospectService.findMany({
    where: { organizationId, ...(options?.enabledOnly ? { enabled: true } : {}) },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { contracts: true } } },
  });
}

function uniqueNameError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return new Error("Υπάρχει ήδη υπηρεσία με αυτό το όνομα");
  }
  return err;
}

export async function createProspectService(
  organizationId: string,
  data: { name?: string }
) {
  const name = data.name?.trim();
  if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
  const maxOrder = await db.prospectService.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });
  try {
    return await db.prospectService.create({
      data: {
        organizationId,
        name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  } catch (err) {
    throw uniqueNameError(err);
  }
}

export async function updateProspectService(
  organizationId: string,
  id: string,
  data: { name?: string; enabled?: boolean }
) {
  const service = await db.prospectService.findFirst({ where: { id, organizationId } });
  if (!service) throw new Error("Η υπηρεσία δεν βρέθηκε");
  const name = data.name?.trim();
  if (data.name !== undefined && !name) throw new Error("Το όνομα είναι υποχρεωτικό");
  try {
    return await db.prospectService.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(typeof data.enabled === "boolean" && { enabled: data.enabled }),
      },
    });
  } catch (err) {
    throw uniqueNameError(err);
  }
}

export async function reorderProspectServices(organizationId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.prospectService.update({
        where: { id, organizationId },
        data: { sortOrder: index },
      })
    )
  );
}

export async function deleteProspectService(organizationId: string, id: string) {
  const service = await db.prospectService.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { contracts: true } } },
  });
  if (!service) throw new Error("Η υπηρεσία δεν βρέθηκε");
  if (service._count.contracts > 0) {
    throw new Error(
      `Η υπηρεσία έχει καταγραφές σε ${service._count.contracts} leads. Απενεργοποιήστε την αντί να τη διαγράψετε.`
    );
  }
  await db.prospectService.delete({ where: { id } });
}

export type ProspectEntryInput = {
  serviceId: string;
  /** true = has contract, false = said "no contract", null = unknown (removes the answer). */
  hasContract: boolean | null;
  provider?: string | null;
  expiresMonth?: string | null;
  monthlyAmount?: string | number | null;
  notes?: string | null;
};

function readAmount(value: ProspectEntryInput["monthlyAmount"]) {
  if (value == null || value === "") return null;
  const amount = Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Μη έγκυρο μηνιαίο κόστος");
  }
  return new Prisma.Decimal(amount.toFixed(2));
}

export async function saveLeadProspecting(
  organizationId: string,
  ctx: ApiContext,
  leadId: string,
  entries: unknown,
  generalNotes?: unknown
) {
  if (!Array.isArray(entries)) throw new Error("Μη έγκυρα δεδομένα");
  if (generalNotes != null && typeof generalNotes !== "string") {
    throw new Error("Μη έγκυρες σημειώσεις");
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true, assignedUserId: true },
  });
  if (!lead || !canAccessLead(ctx, lead)) throw new Error("Το lead δεν βρέθηκε");

  const services = await db.prospectService.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const serviceIds = new Set(services.map((service) => service.id));
  const updatedById = ctx.userId === "api-key" ? null : ctx.userId;

  const operations = (entries as ProspectEntryInput[]).map((entry) => {
    if (!entry || typeof entry.serviceId !== "string" || !serviceIds.has(entry.serviceId)) {
      throw new Error("Μη έγκυρη υπηρεσία");
    }
    const key = { leadId_serviceId: { leadId: lead.id, serviceId: entry.serviceId } };

    if (entry.hasContract !== true && entry.hasContract !== false) {
      return { remove: true as const, key };
    }

    const hasContract = entry.hasContract;
    let expiresAt: Date | null = null;
    if (hasContract && entry.expiresMonth) {
      expiresAt = parseMonth(entry.expiresMonth);
      if (!expiresAt) throw new Error("Μη έγκυρος μήνας λήξης");
    }
    const data = {
      hasContract,
      provider: hasContract ? readPreviousProvider(entry.provider) : null,
      expiresAt,
      monthlyAmount: hasContract ? readAmount(entry.monthlyAmount) : null,
      notes: entry.notes?.trim() || null,
      updatedById,
    };
    return { remove: false as const, key, data, serviceId: entry.serviceId };
  });

  await db.$transaction(async (tx) => {
    if (generalNotes !== undefined) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { prospectingNotes: generalNotes?.trim() || null },
      });
    }
    for (const op of operations) {
      if (op.remove) {
        await tx.prospectContract.deleteMany({
          where: { leadId: lead.id, serviceId: op.key.leadId_serviceId.serviceId },
        });
      } else {
        await tx.prospectContract.upsert({
          where: op.key,
          create: { organizationId, leadId: lead.id, serviceId: op.serviceId, ...op.data },
          update: op.data,
        });
      }
    }
  });

  return db.prospectContract.findMany({
    where: { leadId: lead.id },
    include: { service: true },
  });
}
