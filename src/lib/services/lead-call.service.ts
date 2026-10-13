import type { Prisma } from "@/generated/prisma/client";
import type { ApiContext } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { getLead } from "@/lib/services/lead.service";

export const CALL_QUEUE_PAGE_SIZE = 25;

type CallQueueFilters = {
  search?: string;
  status?: string | string[];
  campaign?: string;
  from?: string;
  to?: string;
  duePage?: number;
  scheduledPage?: number;
};

function statusIds(status?: string | string[]) {
  const values = Array.isArray(status) ? status : status ? [status] : [];
  return values.map((value) => value.trim()).filter(Boolean);
}

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

function searchClause(search?: string): Prisma.LeadWhereInput | undefined {
  const term = search?.trim();
  if (!term) return undefined;
  const digits = term.replace(/\D/g, "");
  return {
    OR: [
      { phone: { contains: term } },
      ...(digits.length >= 3 && digits !== term ? [{ phone: { contains: digits } }] : []),
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { previousProvider: { contains: term, mode: "insensitive" } },
      { campaignName: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
      { source: { name: { contains: term, mode: "insensitive" } } },
      { status: { name: { contains: term, mode: "insensitive" } } },
      { assignedUser: { name: { contains: term, mode: "insensitive" } } },
    ],
  };
}

function queueWhere(
  organizationId: string,
  ctx: ApiContext,
  filters?: CallQueueFilters
): Prisma.LeadWhereInput {
  const statuses = statusIds(filters?.status);
  const from = filters?.from ? dayStart(filters.from) : null;
  const to = filters?.to ? dayEnd(filters.to) : null;
  const search = searchClause(filters?.search);
  return {
    organizationId,
    ...(ctx.isAdmin ? {} : { assignedUserId: ctx.userId }),
    status: {
      isClosed: false,
      isConverted: false,
      ...(statuses.length > 0 ? { id: { in: statuses } } : {}),
    },
    ...(filters?.campaign ? { campaignName: filters.campaign } : {}),
    ...((from || to) && {
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    }),
    ...(search ? { AND: [search] } : {}),
  };
}

const queueInclude = {
  source: true,
  status: true,
  assignedUser: { select: { id: true, name: true } },
} as const;

async function listBucket(
  where: Prisma.LeadWhereInput,
  orderBy: Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[],
  page: number
) {
  const total = await db.lead.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / CALL_QUEUE_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const leads =
    total === 0
      ? []
      : await db.lead.findMany({
          where,
          include: queueInclude,
          orderBy,
          skip: (current - 1) * CALL_QUEUE_PAGE_SIZE,
          take: CALL_QUEUE_PAGE_SIZE,
        });
  return { leads, total, page: current, pageCount };
}

export async function listCallQueue(
  organizationId: string,
  ctx: ApiContext,
  filters?: CallQueueFilters
) {
  const now = new Date();
  const base = queueWhere(organizationId, ctx, filters);

  const [due, scheduled] = await Promise.all([
    listBucket(
      { ...base, OR: [{ callbackAt: null }, { callbackAt: { lte: now } }] },
      [{ callbackAt: "asc" }, { createdAt: "asc" }],
      filters?.duePage ?? 1
    ),
    listBucket(
      { ...base, callbackAt: { gt: now } },
      { callbackAt: "asc" },
      filters?.scheduledPage ?? 1
    ),
  ]);

  return { due, scheduled };
}

export async function recordLeadCall(
  organizationId: string,
  ctx: ApiContext,
  input: {
    id: string;
    status: string;
    comment?: string | null;
    callbackAt?: string | null;
  }
) {
  const lead = await getLead(organizationId, input.id);
  if (!lead) throw new Error("Το lead δεν βρέθηκε");
  if (
    !ctx.isAdmin &&
    lead.assignedUserId &&
    lead.assignedUserId !== ctx.userId
  ) {
    throw new Error("Δεν έχετε πρόσβαση σε αυτό το lead");
  }

  const stage = await db.leadStage.findFirst({
    where: { id: input.status, organizationId },
  });
  if (!stage || stage.isConverted) {
    throw new Error("Μη έγκυρη κατάσταση");
  }

  const comment = input.comment?.trim() ?? "";
  const callbackAt =
    stage.isClosed || !input.callbackAt ? null : new Date(input.callbackAt);
  if (callbackAt && Number.isNaN(callbackAt.getTime())) {
    throw new Error("Μη έγκυρη ημερομηνία επανάκλησης");
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        statusId: stage.id,
        callbackAt,
        assignedUserId:
          lead.assignedUserId ??
          (ctx.userId === "api-key" ? null : ctx.userId),
      },
    });
    if (comment) {
      await tx.leadComment.create({
        data: {
          organizationId,
          leadId: lead.id,
          userId: ctx.userId,
          body: comment,
        },
      });
    }
  });

  return getLead(organizationId, lead.id);
}
