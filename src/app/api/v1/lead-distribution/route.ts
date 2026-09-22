import { jsonError, jsonOk, withAdmin } from "@/lib/api/handler";
import {
  getLeadDistribution,
  saveLeadDistribution,
} from "@/lib/services/lead-distribution.service";

export const GET = withAdmin(async (_req, ctx) => {
  return jsonOk(await getLeadDistribution(ctx.organizationId));
});

export const PUT = withAdmin(async (req, ctx) => {
  const body = await req.json();
  try {
    await saveLeadDistribution(ctx.organizationId, {
      enabled: Boolean(body.enabled),
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : [],
      shares: Array.isArray(body.shares) ? body.shares : [],
    });
    return jsonOk(await getLeadDistribution(ctx.organizationId));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});
