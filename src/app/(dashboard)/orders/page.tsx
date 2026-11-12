import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listOrders } from "@/lib/services/order.service";
import { getTableColumnPreferences } from "@/lib/services/user-preference.service";
import { PageHeader } from "@/components/shared/page-header";
import { ConfigurableTable } from "@/components/shared/configurable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COURIER_CARRIER_LABELS } from "@/config/courier-carriers";
import { formatDateTime } from "@/lib/utils";
import { formatAmount } from "./[id]/order-applications-table";

type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

function statusBadges(order: OrderRow) {
  const statuses = new Map(order.applications.map((app) => [app.status.id, app.status]));
  if (statuses.size === 0) return null;
  return (
    <span className="flex gap-1">
      {[...statuses.values()].map((status) => (
        <Badge key={status.id} style={{ backgroundColor: status.color, color: "#fff" }}>
          {status.name}
        </Badge>
      ))}
    </span>
  );
}

function orderCells(order: OrderRow): Record<string, React.ReactNode> {
  const total = order.applications.reduce(
    (sum, app) => sum + Number(app.agreedMonthlyAmount ?? app.offer?.catalogMonthlyAmount ?? 0),
    0
  );
  return {
    orderRef: order.orderRef,
    customer: `${order.customer.firstName} ${order.customer.lastName}`,
    phone: order.customer.contactPhone,
    vatNumber: order.customer.vatNumber,
    taxOffice: order.customer.taxOffice,
    source: order.source?.name,
    seller: order.seller?.name,
    salesCode: order.salesCode,
    applications: order.applications.length,
    statuses: statusBadges(order),
    total: <span className="tabular-nums">{formatAmount(total)}</span>,
    delivery:
      order.contractDelivery === "esign"
        ? `eSign (${order.esignChannel === "sms" ? "SMS" : "Email"})`
        : "Courier",
    city: order.shippingAddress?.city,
    tracking:
      order.shipments.length > 0
        ? order.shipments
            .map((shipment) => `${COURIER_CARRIER_LABELS[shipment.carrier]} ${shipment.trackingNumber}`)
            .join(", ")
        : null,
    notes: order.notes && (
      <span className="block max-w-xs truncate" title={order.notes}>
        {order.notes}
      </span>
    ),
    createdAt: formatDateTime(order.createdAt),
  };
}

export default async function OrdersPage() {
  const ctx = await requireAuthContext();
  const [orders, columns] = await Promise.all([
    listOrders(ctx.organizationId, ctx),
    getTableColumnPreferences(ctx.userId, "orders"),
  ]);

  return (
    <div>
      <PageHeader
        title="Παραγγελίες"
        action={<Button asChild><Link href="/orders/new">Νέα Παραγγελία</Link></Button>}
      />
      <ConfigurableTable
        table="orders"
        columns={columns}
        rows={orders.map((order) => ({
          id: order.id,
          href: `/orders/${order.id}`,
          cells: orderCells(order),
        }))}
      />
    </div>
  );
}
