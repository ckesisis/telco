import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listApplications } from "@/lib/services/order.service";
import { getTableColumnPreferences } from "@/lib/services/user-preference.service";
import { PageHeader } from "@/components/shared/page-header";
import { ConfigurableTable } from "@/components/shared/configurable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { APPLICATION_TYPE_LABELS } from "@/config/application-types";
import { formatDateTime } from "@/lib/utils";
import { formatAmount } from "../orders/[id]/order-applications-table";

type AppRow = Awaited<ReturnType<typeof listApplications>>[number];

function truncated(value: string | null) {
  if (!value) return null;
  return (
    <span className="block max-w-xs truncate" title={value}>
      {value}
    </span>
  );
}

function appCells(app: AppRow): Record<string, React.ReactNode> {
  const amount = formatAmount(app.agreedMonthlyAmount ?? app.offer?.catalogMonthlyAmount);
  return {
    customer: `${app.order.customer.firstName} ${app.order.customer.lastName}`,
    phone: app.order.customer.contactPhone,
    orderRef: (
      <Link href={`/orders/${app.order.id}`} className="text-blue-600 hover:underline">
        {app.order.orderRef}
      </Link>
    ),
    productLine: PRODUCT_LINE_LABELS[app.productLine],
    offer: app.offer?.name,
    applicationType: app.applicationType && APPLICATION_TYPE_LABELS[app.applicationType],
    status: (
      <Badge style={{ backgroundColor: app.status.color, color: "#fff" }}>{app.status.name}</Badge>
    ),
    portingNumber: app.portingNumber,
    previousProvider: app.previousProvider,
    msisdn: app.msisdn,
    msisdnSn: app.msisdnSn,
    registrationCode: app.registrationCode,
    applicationNumber: app.applicationNumber,
    simCard: app.simCard,
    amount: amount && <span className="tabular-nums">{amount}</span>,
    isGift: app.isGift ? "Ναι" : "Όχι",
    seller: app.order.seller?.name,
    source: app.order.source?.name,
    pendingReason: truncated(app.pendingReason),
    cancellationReason: truncated(app.cancellationReason),
    notes: truncated(app.notes),
    createdAt: formatDateTime(app.createdAt),
  };
}

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [apps, columns] = await Promise.all([
    listApplications(ctx.organizationId, ctx, { search: query || undefined }),
    getTableColumnPreferences(ctx.userId, "apps"),
  ]);

  return (
    <div>
      <PageHeader
        title="Αιτήσεις"
        description={
          query ? `${apps.length} αποτελέσματα για «${query}»` : "Λειτουργική λίστα αιτήσεων"
        }
      />
      <ConfigurableTable
        table="apps"
        columns={columns}
        toolbar={
          <form method="get" className="flex gap-2">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Αναζήτηση: πελάτης, τηλέφωνο, προσφορά, κατάσταση, κωδικός"
              className="max-w-md"
            />
            <Button type="submit">Αναζήτηση</Button>
            {query && (
              <Button asChild variant="outline">
                <Link href="/apps">Καθαρισμός</Link>
              </Button>
            )}
          </form>
        }
        rows={apps.map((app) => ({
          id: app.id,
          href: `/apps/${app.id}`,
          cells: appCells(app),
        }))}
      />
    </div>
  );
}
