import { withAuth, jsonOk, jsonError } from "@/lib/api/handler";
import {
  dismissCallEvent,
  listPendingCallEvents,
} from "@/lib/services/call.service";

export const GET = withAuth(async (_req, ctx) => {
  return jsonOk(await listPendingCallEvents(ctx));
});

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const id = body.id as string | undefined;
  if (!id) return jsonError("id is required", 400);

  try {
    await dismissCallEvent(ctx.organizationId, id);
    return jsonOk({ success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
