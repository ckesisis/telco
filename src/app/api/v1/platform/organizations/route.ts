import { jsonError, jsonOk, withSuperAdmin } from "@/lib/api/handler";
import {
  createOrganization,
  deleteOrganization,
  parseOrganizationInput,
  updateOrganization,
} from "@/lib/services/platform.service";

export const POST = withSuperAdmin(async (request) => {
  const body = await request.json();
  try {
    const input = parseOrganizationInput(body);
    const organization = await createOrganization(input.name, input.slug);
    return jsonOk(organization, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});

export const PATCH = withSuperAdmin(async (request) => {
  const body = await request.json();
  const id = body.id as string | undefined;
  if (!id) return jsonError("id is required", 400);

  try {
    const input = parseOrganizationInput(body);
    const organization = await updateOrganization(id, input.name, input.slug);
    return jsonOk(organization);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});

export const DELETE = withSuperAdmin(async (request) => {
  const body = await request.json();
  const id = body.id as string | undefined;
  if (!id) return jsonError("id is required", 400);

  try {
    await deleteOrganization(id);
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Σφάλμα", 400);
  }
});
