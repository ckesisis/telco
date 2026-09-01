import { requireAuthContext } from "@/lib/tenancy";
import { listCustomers } from "@/lib/services/customer.service";
import { listSources, listOffers } from "@/lib/services/catalog.service";
import NewOrderForm from "./new-order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; leadId?: string }>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const [customers, sources, offers] = await Promise.all([
    listCustomers(ctx.organizationId, ctx),
    listSources(ctx.organizationId),
    listOffers(ctx.organizationId, true),
  ]);

  return (
    <NewOrderForm
      customers={customers.map(({
        id,
        firstName,
        lastName,
        contactPhone,
        vatNumber,
        documentNumber,
        documentType,
        homeStreet,
        homeNumber,
        homeCity,
        homePostalCode,
        homeRegion,
      }) => ({
        id,
        firstName,
        lastName,
        contactPhone,
        vatNumber,
        documentNumber,
        documentType,
        homeStreet,
        homeNumber,
        homeCity,
        homePostalCode,
        homeRegion,
      }))}
      sources={sources.map(({ id, name }) => ({ id, name }))}
      offers={offers.map(({ id, name, productLine, code }) => ({ id, name, productLine, code }))}
      preselectedCustomerId={params.customerId}
      preselectedLeadId={params.leadId}
    />
  );
}
