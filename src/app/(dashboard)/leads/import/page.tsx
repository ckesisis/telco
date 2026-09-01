import { requireAuthContext } from "@/lib/tenancy";
import { listSources } from "@/lib/services/catalog.service";
import LeadImportForm from "./lead-import-form";

export default async function LeadImportPage() {
  const ctx = await requireAuthContext();
  const sources = await listSources(ctx.organizationId);
  return <LeadImportForm sources={sources} />;
}
