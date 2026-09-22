import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";

export async function getDashboardStats(
  organizationId: string,
  ctx: ApiContext,
  from: Date,
  to: Date
) {
  const dateFilter = { gte: from, lte: to };
  const leadFilter = ctx.isAdmin
    ? {}
    : {
        OR: [{ assignedUserId: ctx.userId }, { assignedUserId: null }],
      };

  const [
    leadsCount,
    convertedLeads,
    customersCount,
    ordersCount,
    appsCount,
    activatedApps,
    appsByStatus,
    appsByLine,
    appsBySource,
  ] = await Promise.all([
    db.lead.count({
      where: { organizationId, createdAt: dateFilter, ...leadFilter },
    }),
    db.lead.count({
      where: {
        organizationId,
        status: "converted",
        createdAt: dateFilter,
        ...leadFilter,
      },
    }),
    db.customer.count({
      where: { organizationId, createdAt: dateFilter },
    }),
    db.order.count({
      where: {
        organizationId,
        createdAt: dateFilter,
        ...(ctx.isAdmin
          ? {}
          : {
              OR: [
                { sellerId: ctx.userId },
                { salesCode: ctx.salesCode ?? undefined },
                { sellerId: null },
              ],
            }),
      },
    }),
    db.application.count({
      where: {
        organizationId,
        isGift: false,
        createdAt: dateFilter,
        order: ctx.isAdmin
          ? {}
          : {
              OR: [
                { sellerId: ctx.userId },
                { salesCode: ctx.salesCode ?? undefined },
                { sellerId: null },
              ],
            },
      },
    }),
    db.application.count({
      where: {
        organizationId,
        isGift: false,
        createdAt: dateFilter,
        status: { isSuccess: true },
        order: ctx.isAdmin
          ? {}
          : {
              OR: [
                { sellerId: ctx.userId },
                { salesCode: ctx.salesCode ?? undefined },
                { sellerId: null },
              ],
            },
      },
    }),
    db.application.groupBy({
      by: ["statusId"],
      where: {
        organizationId,
        isGift: false,
        createdAt: dateFilter,
      },
      _count: true,
    }),
    db.application.groupBy({
      by: ["productLine"],
      where: {
        organizationId,
        isGift: false,
        createdAt: dateFilter,
      },
      _count: true,
    }),
    db.order.groupBy({
      by: ["sourceId"],
      where: {
        organizationId,
        createdAt: dateFilter,
        sourceId: { not: null },
      },
      _count: true,
    }),
  ]);

  const statuses = await db.appStatus.findMany({
    where: { organizationId },
  });
  const statusMap = new Map(statuses.map((s) => [s.id, s.name]));
  const sources = await db.source.findMany({ where: { organizationId } });
  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

  return {
    leadsCount,
    convertedLeads,
    leadConversionRate:
      leadsCount > 0 ? Math.round((convertedLeads / leadsCount) * 100) : 0,
    customersCount,
    ordersCount,
    appsCount,
    activatedApps,
    activationRate:
      appsCount > 0 ? Math.round((activatedApps / appsCount) * 100) : 0,
    appsByStatus: appsByStatus.map((row) => ({
      statusId: row.statusId,
      statusName: statusMap.get(row.statusId) ?? "Unknown",
      count: row._count,
    })),
    appsByLine: appsByLine.map((row) => ({
      productLine: row.productLine,
      count: row._count,
    })),
    appsBySource: appsBySource.map((row) => ({
      sourceId: row.sourceId,
      sourceName: row.sourceId
        ? sourceMap.get(row.sourceId) ?? "Unknown"
        : "—",
      count: row._count,
    })),
  };
}
