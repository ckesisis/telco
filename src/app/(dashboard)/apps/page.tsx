import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listApplications } from "@/lib/services/order.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { formatDateTime } from "@/lib/utils";

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const apps = await listApplications(ctx.organizationId, ctx, {
    search: query || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Αιτήσεις"
        description={
          query ? `${apps.length} αποτελέσματα για «${query}»` : "Λειτουργική λίστα αιτήσεων"
        }
      />
      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Αναζήτηση: πελάτης, τηλέφωνο, προσφορά, κατάσταση"
          className="max-w-md"
        />
        <Button type="submit">Αναζήτηση</Button>
        {query && (
          <Button asChild variant="outline">
            <Link href="/apps">Καθαρισμός</Link>
          </Button>
        )}
      </form>
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
