import { withAuth, jsonOk } from "@/lib/api/handler";
import { getReport } from "@/lib/services/reporting.service";
import { parseReportFilters, searchParamsToRecord } from "@/lib/reporting/filters";

/**
 * GET /api/v1/reporting?preset=month|today|week|last_month|last_30|custom
 *   &from=YYYY-MM-DD&to=YYYY-MM-DD&agentId=&sourceId=&campaign=&productLine=
 */
export const GET = withAuth(async (req, ctx) => {
  const filters = parseReportFilters(searchParamsToRecord(req.nextUrl.searchParams), ctx);
  return jsonOk(await getReport(ctx, filters));
});
