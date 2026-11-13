import { requireAuthContext } from "@/lib/tenancy";
import { seesAllRecords } from "@/config/roles";
import { listSources } from "@/lib/services/catalog.service";
import { getLeadDistribution } from "@/lib/services/lead-distribution.service";
import LeadImportForm from "./lead-import-form";

export default async function LeadImportPage() {
  const ctx = await requireAuthContext();
  const canShare = seesAllRecords(ctx.role);
  const [sources, distribution] = await Promise.all([
    listSources(ctx.organizationId),
    canShare ? getLeadDistribution(ctx.organizationId) : Promise.resolve(null),
  ]);
  return (
    <LeadImportForm
      sources={sources}
      canShare={canShare}
      agents={distribution?.agents ?? []}
      defaultShares={distribution?.shares ?? []}
    />
  );
}
