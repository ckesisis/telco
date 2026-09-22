import { jsonError, jsonOk, withSuperAdmin } from "@/lib/api/handler";
import { setActiveOrganization } from "@/lib/services/platform.service";

export const POST = withSuperAdmin(async (request, session) => {
  const body = await request.json();
  const organizationId =
    typeof body.organizationId === "string" ? body.organizationId : null;

  try {
    await setActiveOrganization(session.session.token, organizationId);
    return jsonOk({ organizationId });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});
