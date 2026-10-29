import { requireAdminContext } from "@/lib/tenancy";
import { listProspectServices } from "@/lib/services/prospecting.service";
import { ProspectServicesSettings } from "./prospect-services-settings";

export default async function ProspectServicesPage() {
  const ctx = await requireAdminContext();
  const services = await listProspectServices(ctx.organizationId);
  return (
    <ProspectServicesSettings
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        enabled: service.enabled,
        leadCount: service._count.contracts,
      }))}
    />
  );
}
