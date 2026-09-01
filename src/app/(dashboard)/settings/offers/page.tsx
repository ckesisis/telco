import { requireAdminContext } from "@/lib/tenancy";
import { listOffers } from "@/lib/services/catalog.service";
import { OffersSettings } from "./offers-settings";

export default async function OffersSettingsPage() {
  const ctx = await requireAdminContext();
  const offers = await listOffers(ctx.organizationId);
  return <OffersSettings offers={offers.map((o) => ({ ...o, catalogMonthlyAmount: o.catalogMonthlyAmount?.toString() ?? null }))} />;
}
