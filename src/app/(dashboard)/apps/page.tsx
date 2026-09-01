import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listApplications } from "@/lib/services/order.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { formatDateTime } from "@/lib/utils";

export default async function AppsPage() {
  const ctx = await requireAuthContext();
  const apps = await listApplications(ctx.organizationId, ctx);

  return (
    <div>
      <PageHeader title="Αιτήσεις" description="Λειτουργική λίστα αιτήσεων" />
      <DataTable
        headers={["Πελάτης", "Γραμμή", "Προσφορά", "Κατάσταση", "Ημ/νία", ""]}
        rows={apps.map((app) => [
          `${app.order.customer.firstName} ${app.order.customer.lastName}`,
          PRODUCT_LINE_LABELS[app.productLine],
          app.offer?.name ?? "—",
          <Badge key={app.id} style={{ backgroundColor: app.status.color, color: "#fff" }}>
            {app.status.name}
          </Badge>,
          formatDateTime(app.createdAt),
          <Link key={`link-${app.id}`} href={`/apps/${app.id}`} className="text-sm text-blue-600 hover:underline">
            Προβολή
          </Link>,
        ])}
      />
    </div>
  );
}
