import { requireAdminContext } from "@/lib/tenancy";
import { listAppStatuses } from "@/lib/services/catalog.service";
import { AppStatusesSettings } from "./app-statuses-settings";

export default async function AppStatusesSettingsPage() {
  const ctx = await requireAdminContext();
  const statuses = await listAppStatuses(ctx.organizationId);
  return <AppStatusesSettings statuses={statuses} />;
}
