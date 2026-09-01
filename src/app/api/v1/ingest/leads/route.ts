import { withApiKey, jsonOk, jsonError } from "@/lib/api/handler";
import { createLead } from "@/lib/services/lead.service";

export const POST = withApiKey(async (req, ctx) => {
  try {
    const body = await req.json();
    const leads = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of leads) {
      if (!item.phone || !item.sourceId) {
        results.push({ error: "phone and sourceId are required" });
        continue;
      }
      const lead = await createLead(ctx.organizationId, ctx, item);
      results.push({ id: lead.id, phone: lead.phone });
    }

    return jsonOk({ results }, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
