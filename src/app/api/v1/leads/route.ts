import { withAuth, withApiKey, jsonOk, jsonError } from "@/lib/api/handler";
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  convertLead,
  importLeads,
} from "@/lib/services/lead.service";
import { recordLeadCall } from "@/lib/services/lead-call.service";

export const GET = withAuth(async (req, ctx) => {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const lead = await getLead(ctx.organizationId, id);
    if (!lead || (lead.assignedUserId && lead.assignedUserId !== ctx.userId && !ctx.isAdmin)) {
      return jsonError("Not found", 404);
    }
    return jsonOk(lead);
  }
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  return jsonOk(await listLeads(ctx.organizationId, ctx, { status, search }));
});

export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    if (body.action === "convert") {
      return jsonOk(await convertLead(ctx.organizationId, ctx, body.id));
    }
    if (body.action === "call") {
      return jsonOk(
        await recordLeadCall(ctx.organizationId, ctx, {
          id: body.id,
          status: body.status,
          comment: body.comment,
          callbackAt: body.callbackAt,
        })
      );
    }
    if (body.action === "import") {
      return jsonOk(
        await importLeads(ctx.organizationId, ctx, body.sourceId, body.rows)
      );
    }
    const lead = await createLead(ctx.organizationId, ctx, body);
    return jsonOk(lead, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return jsonError("Missing id", 400);
  try {
    return jsonOk(await updateLead(ctx.organizationId, ctx, id, data));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
