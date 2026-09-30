import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export class LeadStageInUseError extends Error {
  constructor(public leadCount: number) {
    super("Η κατάσταση χρησιμοποιείται από leads");
    this.name = "LeadStageInUseError";
  }
}

export const DEFAULT_LEAD_STAGES = [
  { name: "Νέο", color: "#64748b", isDefault: true, isClosed: false, isConverted: false },
  { name: "Επικοινωνήθηκε", color: "#3b82f6", isDefault: false, isClosed: false, isConverted: false },
  { name: "Προκριμένο", color: "#8b5cf6", isDefault: false, isClosed: false, isConverted: false },
  { name: "Χαμένο", color: "#ef4444", isDefault: false, isClosed: true, isConverted: false },
  { name: "Μετατράπηκε", color: "#22c55e", isDefault: false, isClosed: true, isConverted: true },
];

export async function seedLeadStages(organizationId: string) {
  const existing = await db.leadStage.count({ where: { organizationId } });
  if (existing > 0) return;
  await db.leadStage.createMany({
    data: DEFAULT_LEAD_STAGES.map((stage, index) => ({
      organizationId,
      sortOrder: index,
      ...stage,
    })),
  });
}

export async function listLeadStages(organizationId: string) {
  await seedLeadStages(organizationId);
  return db.leadStage.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { leads: true } } },
  });
}

export async function getDefaultLeadStageId(organizationId: string) {
  await seedLeadStages(organizationId);
  const stage = await db.leadStage.findFirst({
    where: { organizationId, isDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!stage) throw new Error("Δεν υπάρχει προεπιλεγμένη κατάσταση lead");
  return stage.id;
}

export async function getConvertedLeadStageId(organizationId: string) {
  await seedLeadStages(organizationId);
  const stage = await db.leadStage.findFirst({
    where: { organizationId, isConverted: true },
  });
  if (!stage) throw new Error("Δεν υπάρχει κατάσταση μετατροπής");
  return stage.id;
}

export async function createLeadStage(
  organizationId: string,
  data: { name: string; color?: string; isClosed?: boolean }
) {
  const name = data.name.trim();
  if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
  const maxOrder = await db.leadStage.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });
  return db.leadStage.create({
    data: {
      organizationId,
      name,
      color: data.color ?? "#6b7280",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isClosed: data.isClosed ?? false,
    },
  });
}

export async function updateLeadStage(
  organizationId: string,
  id: string,
  data: { name?: string; color?: string; isClosed?: boolean }
) {
  const stage = await db.leadStage.findFirst({ where: { id, organizationId } });
  if (!stage) throw new Error("Η κατάσταση δεν βρέθηκε");
  const name = data.name?.trim();
  if (data.name !== undefined && !name) throw new Error("Το όνομα είναι υποχρεωτικό");

  try {
    return await db.leadStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isClosed !== undefined &&
          !stage.isDefault &&
          !stage.isConverted && { isClosed: data.isClosed }),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Υπάρχει ήδη κατάσταση με αυτό το όνομα");
    }
    throw err;
  }
}

export async function reorderLeadStages(organizationId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.leadStage.update({
        where: { id, organizationId },
        data: { sortOrder: index },
      })
    )
  );
}

export async function deleteLeadStage(
  organizationId: string,
  id: string,
  moveToId?: string | null
) {
  const stage = await db.leadStage.findFirst({ where: { id, organizationId } });
  if (!stage) throw new Error("Η κατάσταση δεν βρέθηκε");
  if (stage.isDefault || stage.isConverted) {
    throw new Error("Η προεπιλεγμένη κατάσταση και η μετατροπή δεν διαγράφονται");
  }

  const leadCount = await db.lead.count({ where: { organizationId, statusId: id } });
  if (leadCount > 0 && !moveToId) throw new LeadStageInUseError(leadCount);

  if (moveToId) {
    if (moveToId === id) throw new Error("Επιλέξτε άλλη κατάσταση");
    const target = await db.leadStage.findFirst({
      where: { id: moveToId, organizationId },
    });
    if (!target) throw new Error("Η κατάσταση προορισμού δεν βρέθηκε");
    await db.$transaction([
      db.lead.updateMany({
        where: { organizationId, statusId: id },
        data: {
          statusId: moveToId,
          ...(target.isClosed ? { callbackAt: null } : {}),
        },
      }),
      db.leadStage.delete({ where: { id } }),
    ]);
    return;
  }

  await db.leadStage.delete({ where: { id } });
}
