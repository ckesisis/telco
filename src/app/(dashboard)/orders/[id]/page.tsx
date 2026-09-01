import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { getOrder } from "@/lib/services/order.service";
import { listAppStatuses } from "@/lib/services/catalog.service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { AppStatusSelect } from "@/components/shared/app-status-select";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const [order, statuses] = await Promise.all([
    getOrder(ctx.organizationId, id),
    listAppStatuses(ctx.organizationId),
  ]);
  if (!order) notFound();

  return (
    <div>
      <PageHeader
        title={order.orderRef}
        description={`${order.customer.firstName} ${order.customer.lastName}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Πελάτης & Διεύθυνση</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href={`/customers/${order.customer.id}`} className="text-blue-600 hover:underline">
              {order.customer.firstName} {order.customer.lastName}
            </Link>
            <p>{order.customer.contactPhone}</p>
            <p className="text-slate-500">
              {order.shippingAddress.street} {order.shippingAddress.number}, {order.shippingAddress.city} {order.shippingAddress.postalCode}
            </p>
            <p><span className="text-slate-500">Πηγή:</span> {order.source?.name ?? "—"}</p>
            <p><span className="text-slate-500">Ημ/νία:</span> {formatDateTime(order.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Αιτήσεις ({order.applications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {order.applications.map((app) => (
              <div key={app.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{PRODUCT_LINE_LABELS[app.productLine]}</p>
                    <p className="text-sm text-slate-500">{app.offer?.name ?? "—"}</p>
                  </div>
                  <Badge style={{ backgroundColor: app.status.color, color: "#fff" }}>
                    {app.status.name}
                  </Badge>
                </div>
                <div className="mt-3">
                  <AppStatusSelect
                    applicationId={app.id}
                    currentStatusId={app.statusId}
                    statuses={statuses}
                  />
                </div>
                <Link href={`/apps/${app.id}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  Λεπτομέρειες
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
