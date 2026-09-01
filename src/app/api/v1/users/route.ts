import { withAdmin, jsonOk, jsonError } from "@/lib/api/handler";
import { getMemberProfiles } from "@/lib/services/catalog.service";
import {
  createOrganizationUser,
  updateOrganizationUser,
} from "@/lib/services/user.service";

export const POST = withAdmin(async (req, ctx) => {
  const body = await req.json();
  try {
    await createOrganizationUser(ctx.organizationId, {
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      role: body.role ?? "member",
      salesCode: body.salesCode ?? null,
      contactPhone: body.contactPhone ?? null,
    });
    const members = await getMemberProfiles(ctx.organizationId);
    return jsonOk(members);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});

export const PATCH = withAdmin(async (req, ctx) => {
  const body = await req.json();
  const userId = body.userId as string | undefined;
  if (!userId) return jsonError("userId is required", 400);

  try {
    await updateOrganizationUser(ctx.organizationId, userId, ctx.userId, {
      role: body.role,
      salesCode: body.salesCode,
      contactPhone: body.contactPhone,
    });
    const members = await getMemberProfiles(ctx.organizationId);
    const updated = members.find((m) => m.userId === userId);
    return jsonOk(updated ?? { success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});
