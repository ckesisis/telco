import { withAuth, withAdmin, jsonOk, jsonError } from "@/lib/api/handler";
import {
  listSources,
  createSource,
  updateSource,
  listOffers,
  createOffer,
  updateOffer,
  listAppStatuses,
  createAppStatus,
  updateAppStatus,
  reorderAppStatuses,
  deleteAppStatus,
  getMemberProfiles,
  upsertUserProfile,
} from "@/lib/services/catalog.service";

export const GET = withAuth(async (_req, ctx) => {
  const type = _req.nextUrl.searchParams.get("type");
  switch (type) {
    case "sources":
      return jsonOk(await listSources(ctx.organizationId));
    case "offers":
      return jsonOk(await listOffers(ctx.organizationId));
    case "app-statuses":
      return jsonOk(await listAppStatuses(ctx.organizationId));
    case "members":
      return jsonOk(await getMemberProfiles(ctx.organizationId));
    default:
      return jsonError("Invalid type", 400);
  }
});

export const POST = withAdmin(async (req, ctx) => {
  const body = await req.json();
  const { type, ...data } = body;

  switch (type) {
    case "source":
      return jsonOk(await createSource(ctx.organizationId, data));
    case "offer":
      return jsonOk(await createOffer(ctx.organizationId, data));
    case "app-status":
      return jsonOk(await createAppStatus(ctx.organizationId, data));
    case "reorder-statuses":
      await reorderAppStatuses(ctx.organizationId, data.orderedIds);
      return jsonOk({ success: true });
    case "user-profile":
      return jsonOk(
        await upsertUserProfile(ctx.organizationId, data.userId, data)
      );
    default:
      return jsonError("Invalid type", 400);
  }
});

export const PATCH = withAdmin(async (req, ctx) => {
  const body = await req.json();
  const { type, id, ...data } = body;

  switch (type) {
    case "source":
      return jsonOk(await updateSource(ctx.organizationId, id, data));
    case "offer":
      return jsonOk(await updateOffer(ctx.organizationId, id, data));
    case "app-status":
      return jsonOk(await updateAppStatus(ctx.organizationId, id, data));
    default:
      return jsonError("Invalid type", 400);
  }
});

export const DELETE = withAdmin(async (req, ctx) => {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type");
  if (!id || type !== "app-status") return jsonError("Invalid request", 400);
  try {
    await deleteAppStatus(ctx.organizationId, id);
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
