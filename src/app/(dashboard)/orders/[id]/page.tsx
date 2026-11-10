import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/lib/tenancy";
import { getOrder } from "@/lib/services/order.service";
import { listAppStatuses } from "@/lib/services/catalog.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { OrderView } from "./order-view";

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
        title={`Παραγγελία ${order.orderRef}`}
        description={`${order.customer.firstName} ${order.customer.lastName} · ${formatDateTime(order.orderDate)}`}
        action={
          <Button asChild variant="outline">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
              Πίσω
            </Link>
          </Button>
        }
      />
      <OrderView order={order} statuses={statuses} />
    </div>
  );
}
