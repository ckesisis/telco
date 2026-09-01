import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";

export async function listSources(organizationId: string) {
  return db.source.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createSource(
  organizationId: string,
  data: { name: string; channel: string; enabled?: boolean }
) {
  return db.source.create({
    data: {
      organizationId,
      name: data.name,
      channel: data.channel as never,
      enabled: data.enabled ?? true,
    },
  });
}

export async function updateSource(
  organizationId: string,
  id: string,
  data: { name?: string; channel?: string; enabled?: boolean }
) {
  return db.source.update({
    where: { id, organizationId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.channel !== undefined && { channel: data.channel as never }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
}

export async function listOffers(organizationId: string, activeOnly = false) {
  const now = new Date();
  return db.offer.findMany({
    where: {
      organizationId,
      ...(activeOnly && {
        enabled: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        ],
      }),
    },
    orderBy: [{ productLine: "asc" }, { name: "asc" }],
  });
}

export async function createOffer(
  organizationId: string,
  data: {
    code: string;
    name: string;
    productLine: string;
    catalogMonthlyAmount?: number | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    enabled?: boolean;
    prepaidGroup?: string | null;
  }
) {
  return db.offer.create({
    data: {
      organizationId,
      code: data.code,
      name: data.name,
      productLine: data.productLine as never,
      catalogMonthlyAmount: data.catalogMonthlyAmount,
      validFrom: data.validFrom,
      validTo: data.validTo,
      enabled: data.enabled ?? true,
      prepaidGroup: data.prepaidGroup,
    },
  });
}

export async function updateOffer(
  organizationId: string,
  id: string,
  data: Record<string, unknown>
) {
  return db.offer.update({
    where: { id, organizationId },
    data: data as never,
  });
}

export async function listAppStatuses(organizationId: string) {
  return db.appStatus.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createAppStatus(
  organizationId: string,
  data: {
    name: string;
    color?: string;
    isDefault?: boolean;
    isTerminal?: boolean;
    isSuccess?: boolean;
  }
) {
  const maxOrder = await db.appStatus.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });

  if (data.isDefault) {
    await db.appStatus.updateMany({
      where: { organizationId },
      data: { isDefault: false },
    });
  }

  return db.appStatus.create({
    data: {
      organizationId,
      name: data.name,
      color: data.color ?? "#6b7280",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      isDefault: data.isDefault ?? false,
      isTerminal: data.isTerminal ?? false,
      isSuccess: data.isSuccess ?? false,
    },
  });
}

export async function updateAppStatus(
  organizationId: string,
  id: string,
  data: Record<string, unknown>
) {
  if (data.isDefault) {
    await db.appStatus.updateMany({
      where: { organizationId },
      data: { isDefault: false },
    });
  }
  return db.appStatus.update({
    where: { id, organizationId },
    data: data as never,
  });
}

export async function reorderAppStatuses(
  organizationId: string,
  orderedIds: string[]
) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.appStatus.update({
        where: { id, organizationId },
        data: { sortOrder: index },
      })
    )
  );
}

export async function deleteAppStatus(organizationId: string, id: string) {
  const count = await db.appStatus.count({ where: { organizationId } });
  if (count <= 1) throw new Error("Cannot delete the last status");

  const inUse = await db.application.count({
    where: { organizationId, statusId: id },
  });
  if (inUse > 0) throw new Error("Status is in use by applications");

  return db.appStatus.delete({ where: { id, organizationId } });
}

export async function listMembers(organizationId: string) {
  return db.member.findMany({
    where: { organizationId },
    include: {
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMemberProfiles(organizationId: string) {
  const members = await listMembers(organizationId);
  const profiles = await db.userProfile.findMany({
    where: { organizationId },
  });
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  return members.map((m) => ({
    ...m,
    profile: profileMap.get(m.userId) ?? null,
  }));
}

export async function upsertUserProfile(
  organizationId: string,
  userId: string,
  data: { salesCode?: string | null; contactPhone?: string | null; blocked?: boolean }
) {
  return db.userProfile.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: { organizationId, userId, ...data },
    update: data,
  });
}

export function canAgentSeeRecord(
  ctx: ApiContext,
  record: { salesCode?: string | null; sellerId?: string | null; assignedUserId?: string | null }
) {
  if (ctx.isAdmin) return true;
  if (record.sellerId === ctx.userId || record.assignedUserId === ctx.userId) return true;
  if (!record.salesCode && !record.sellerId && !record.assignedUserId) return true;
  if (ctx.salesCode && record.salesCode === ctx.salesCode) return true;
  return false;
}
