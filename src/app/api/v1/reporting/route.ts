import { withAuth, jsonOk } from "@/lib/api/handler";
import { getDashboardStats } from "@/lib/services/reporting.service";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export const GET = withAuth(async (req, ctx) => {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const from = fromParam ? parseISO(fromParam) : startOfMonth(new Date());
  const to = toParam ? parseISO(toParam) : endOfMonth(new Date());

  const stats = await getDashboardStats(ctx.organizationId, ctx, from, to);
  return jsonOk(stats);
});
