import { withAdmin, jsonOk, jsonError } from "@/lib/api/handler";
import { createApiKey, listApiKeys } from "@/lib/services/api-key.service";

export const GET = withAdmin(async (_req, ctx) => {
  return jsonOk(await listApiKeys(ctx.organizationId));
});

export const POST = withAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  try {
    const key = await createApiKey(ctx.organizationId, String(body.name ?? "Ingest"));
    return jsonOk(key, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
