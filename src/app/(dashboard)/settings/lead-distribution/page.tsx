import { requireAdminContext } from "@/lib/tenancy";
import { getLeadDistribution } from "@/lib/services/lead-distribution.service";
import { LeadDistributionSettings } from "./lead-distribution-settings";

export default async function LeadDistributionPage() {
  const ctx = await requireAdminContext();
  const settings = await getLeadDistribution(ctx.organizationId);
  return <LeadDistributionSettings settings={settings} />;
}
