import { NextResponse } from "next/server";
import { withAuth, withAdmin, jsonOk, jsonError } from "@/lib/api/handler";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  CustomerPhoneExistsError,
} from "@/lib/services/customer.service";

export const GET = withAuth(async (req, ctx) => {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const customer = await getCustomer(ctx.organizationId, id);
    if (!customer) return jsonError("Not found", 404);
    return jsonOk(customer);
  }
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  return jsonOk(await listCustomers(ctx.organizationId, ctx, search));
});

export const POST = withAuth(async (req, ctx) => {
  try {
    const body = await req.json();
    const customer = await createCustomer(ctx.organizationId, body);
    return jsonOk(customer, 201);
  } catch (err) {
    if (err instanceof CustomerPhoneExistsError) {
      return NextResponse.json(
        { error: err.message, customer: err.customer },
        { status: 409 }
      );
    }
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code === "P2002") {
      return jsonError("Υπάρχει ήδη πελάτης με αυτό το τηλέφωνο", 409);
    }
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return jsonError("Missing id", 400);
  try {
    return jsonOk(await updateCustomer(ctx.organizationId, id, data));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Error", 400);
  }
});
