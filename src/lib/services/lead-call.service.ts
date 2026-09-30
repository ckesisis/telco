import type { ApiContext } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { getLead } from "@/lib/services/lead.service";

function queueWhere(organizationId: string, ctx: ApiContext) {
  return {
    organizationId,
    ...(ctx.isAdmin ? {} : { assignedUserId: ctx.userId }),
    status: { isClosed: false, isConverted: false },
  };
}

const queueInclude = {
  source: true,
  status: true,
  assignedUser: { select: { id: true, name: true } },
} as const;

export async function listCallQueue(organizationId: string, ctx: ApiContext) {
  const now = new Date();
  const base = queueWhere(organizationId, ctx);

  const [due, scheduled] = await Promise.all([
    db.lead.findMany({
      where: {
        ...base,
        OR: [{ callbackAt: null }, { callbackAt: { lte: now } }],
      },
      include: queueInclude,
      orderBy: [{ callbackAt: "asc" }, { createdAt: "asc" }],
    }),
    db.lead.findMany({
      where: { ...base, callbackAt: { gt: now } },
      include: queueInclude,
      orderBy: { callbackAt: "asc" },
    }),
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
