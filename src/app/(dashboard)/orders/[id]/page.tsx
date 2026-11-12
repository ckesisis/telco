import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/lib/tenancy";
import { getOrder } from "@/lib/services/order.service";
import { listAppStatuses, listOffers, listSources } from "@/lib/services/catalog.service";
import { canEditBackOfficeFields, canEditOrder, canManageShipments } from "@/config/roles";
import { editableOffers } from "@/components/orders/editable-application";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { OrderView } from "./order-view";
import { OrderEditDialog } from "./order-edit-dialog";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const [order, statuses, sources, activeOffers] = await Promise.all([
    getOrder(ctx.organizationId, id),
    listAppStatuses(ctx.organizationId),
    listSources(ctx.organizationId),
    listOffers(ctx.organizationId, true),
  ]);
  if (!order) notFound();
  const canEdit = canEditOrder(ctx, order);
  const offers = editableOffers(
    activeOffers.map(({ id, name, productLine }) => ({ id, name, productLine })),
    order.applications.map((app) => app.offer)
  );

  return (
    <div>
      <PageHeader
        title={`Παραγγελία ${order.orderRef}`}
        description={`${order.customer.firstName} ${order.customer.lastName} · ${formatDateTime(order.orderDate)}`}
        action={
          <div className="flex gap-2">
            {canEdit && (
              <OrderEditDialog
                sources={sources.map(({ id, name }) => ({ id, name }))}
                order={{
                  id: order.id,
                  sourceId: order.sourceId,
                  notes: order.notes,
                  contractDelivery: order.contractDelivery,
                  esignChannel: order.esignChannel,
                  esignEmail: order.esignEmail,
                  esignPhone: order.esignPhone,
                  shippingAddress: order.shippingAddress && {
                    street: order.shippingAddress.street,
                    number: order.shippingAddress.number,
                    city: order.shippingAddress.city,
                    postalCode: order.shippingAddress.postalCode,
                    region: order.shippingAddress.region,
                    floor: order.shippingAddress.floor,
                    notes: order.shippingAddress.notes,
                  },
                }}
              />
            )}
            <Button asChild variant="outline">
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4" />
                Πίσω
              </Link>
            </Button>
          </div>
        }
      />
      <OrderView
        order={order}
        statuses={statuses}
        offers={offers}
        canEdit={canEdit}
        canEditBackOffice={canEditBackOfficeFields(ctx.role)}
        canManageShipments={canManageShipments(ctx.role)}
      />
    </div>
  );
}
