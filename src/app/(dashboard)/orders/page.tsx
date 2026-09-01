import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listOrders } from "@/lib/services/order.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export default async function OrdersPage() {
  const ctx = await requireAuthContext();
  const orders = await listOrders(ctx.organizationId, ctx);

  return (
    <div>
      <PageHeader
        title="Παραγγελίες"
        action={<Button asChild><Link href="/orders/new">Νέα Παραγγελία</Link></Button>}
      />
      <DataTable
        headers={["Αναφορά", "Πελάτης", "Πηγή", "Αιτήσεις", "Ημ/νία", ""]}
        rows={orders.map((o) => [
          o.orderRef,
          `${o.customer.firstName} ${o.customer.lastName}`,
          o.source?.name ?? "—",
          o.applications.length,
          formatDateTime(o.createdAt),
          <Link key={o.id} href={`/orders/${o.id}`} className="text-sm text-blue-600 hover:underline">Προβολή</Link>,
        ])}
      />
    </div>
  );
}
