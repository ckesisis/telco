import { requireAuthContext } from "@/lib/tenancy";
import { listSources } from "@/lib/services/catalog.service";
import NewLeadForm from "./new-lead-form";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const sources = await listSources(ctx.organizationId);

  return <NewLeadForm sources={sources} initialPhone={params.phone ?? ""} />;
}
