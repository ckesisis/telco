import { requireAdminContext } from "@/lib/tenancy";
import { listLeadStages } from "@/lib/services/lead-status.service";
import { LeadStatusesSettings } from "./lead-statuses-settings";

export default async function LeadStatusesPage() {
  const ctx = await requireAdminContext();
  const stages = await listLeadStages(ctx.organizationId);
  return (
    <LeadStatusesSettings
      stages={stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        isDefault: stage.isDefault,
        isClosed: stage.isClosed,
        isConverted: stage.isConverted,
        leadCount: stage._count.leads,
      }))}
    />
  );
}
