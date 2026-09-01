import { withAuth, jsonOk, jsonError } from "@/lib/api/handler";
import {
  listOrders,
  getOrder,
  createOrder,
  listApplications,
  getApplication,
  updateApplicationStatus,
} from "@/lib/services/order.service";

export const GET = withAuth(async (req, ctx) => {
  const resource = req.nextUrl.searchParams.get("resource") ?? "orders";
  const id = req.nextUrl.searchParams.get("id");

  if (resource === "applications") {
    if (id) {
      const app = await getApplication(ctx.organizationId, id);
      if (!app) return jsonError("Not found", 404);
      return jsonOk(app);
    }
    const statusId = req.nextUrl.searchParams.get("statusId") ?? undefined;
    const productLine = req.nextUrl.searchParams.get("productLine") ?? undefined;
    return jsonOk(
      await listApplications(ctx.organizationId, ctx, { statusId, productLine })
    );
  }

  if (id) {
    const order = await getOrder(ctx.organizationId, id);
    if (!order) return jsonError("Not found", 404);
    return jsonOk(order);
  }

  return jsonOk(await listOrders(ctx.organizationId, ctx));
});

export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    if (body.action === "update-status") {
      const app = await updateApplicationStatus(
        ctx.organizationId,
        ctx,
        body.id,
        body.statusId,
        body
      );
      return jsonOk(app);
    }
    const order = await createOrder(ctx.organizationId, ctx, body);
    return jsonOk(order, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
