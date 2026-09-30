import { withAuth, jsonOk, jsonError } from "@/lib/api/handler";
import { saveLeadColumnPreferences } from "@/lib/services/user-preference.service";

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const columns = body?.columns;
  if (!Array.isArray(columns)) return jsonError("columns is required");

  const saved = await saveLeadColumnPreferences(ctx.userId, columns);
  return jsonOk(saved);
});
