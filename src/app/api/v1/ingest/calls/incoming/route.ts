import { withApiKey, jsonOk, jsonError } from "@/lib/api/handler";
import { recordCallEvent } from "@/lib/services/call.service";

export const POST = withApiKey(async (req, ctx) => {
  try {
    const body = await req.json();
    const event = await recordCallEvent(ctx.organizationId, {
      kind: "incoming",
      phone: String(body.phone ?? ""),
      externalCallId: body.callId ?? body.externalCallId ?? null,
      salesCode: body.salesCode ?? null,
      msisdn: body.msisdn ?? null,
      payload: body,
    });
    return jsonOk(event, 201);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
