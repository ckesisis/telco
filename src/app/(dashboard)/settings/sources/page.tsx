import { requireAdminContext } from "@/lib/tenancy";
import { listSources } from "@/lib/services/catalog.service";
import { SourcesSettings } from "./sources-settings";

export default async function SourcesSettingsPage() {
  const ctx = await requireAdminContext();
  const sources = await listSources(ctx.organizationId);
  return <SourcesSettings sources={sources} />;
}
