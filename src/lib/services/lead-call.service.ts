import type { LeadStatus } from "@/generated/prisma/client";
import type { ApiContext } from "@/lib/api/handler";
import { LEAD_STATUSES } from "@/config/lead-statuses";
import { db } from "@/lib/db";
import { getLead } from "@/lib/services/lead.service";

const CLOSED: LeadStatus[] = ["converted", "lost"];

function queueWhere(organizationId: string, ctx: ApiContext) {
  return {
    organizationId,
    ...(ctx.isAdmin ? {} : { assignedUserId: ctx.userId }),
    status: { notIn: CLOSED },
  };
}

const queueInclude = {
  source: true,
  assignedUser: { select: { id: true, name: true } },
} as const;

export async function listCallQueue(organizationId: string, ctx: ApiContext) {
  const now = new Date();
  const base = queueWhere(organizationId, ctx);

  const [due, scheduled] = await Promise.all([
    db.lead.findMany({
      where: {
        ...base,
        OR: [{ status: "new", callbackAt: null }, { callbackAt: { lte: now } }],
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
  if (!LEAD_STATUSES.includes(input.status as LeadStatus)) {
    throw new Error("Μη έγκυρη κατάσταση");
  }
  if (input.status === "converted") {
    throw new Error("Χρησιμοποιήστε μετατροπή σε πελάτη");
  }

  const comment = input.comment?.trim() ?? "";
  const callbackAt =
    input.status === "lost" || !input.callbackAt
      ? null
      : new Date(input.callbackAt);
  if (callbackAt && Number.isNaN(callbackAt.getTime())) {
    throw new Error("Μη έγκυρη ημερομηνία επανάκλησης");
  }
  if (input.status === "lost" && input.callbackAt) {
    throw new Error("Η επανάκληση δεν συνδυάζεται με χαμένο lead");
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: input.status as LeadStatus,
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
