import { withAuth, jsonOk, jsonError } from "@/lib/api/handler";
import { isTableKey } from "@/lib/table-columns";
import { saveTableColumnPreferences } from "@/lib/services/user-preference.service";

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  if (!isTableKey(body?.table)) return jsonError("table is required");
  if (!Array.isArray(body?.columns)) return jsonError("columns is required");

  return jsonOk(await saveTableColumnPreferences(ctx.userId, body.table, body.columns));
});
