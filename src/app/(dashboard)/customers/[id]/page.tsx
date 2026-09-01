import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { getCustomer } from "@/lib/services/customer.service";
import { listSources } from "@/lib/services/catalog.service";
import { CustomerDetailsCard } from "@/components/customers/customer-details-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { LEAD_STATUS_LABELS } from "@/config/lead-statuses";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const [customer, sources] = await Promise.all([
    getCustomer(ctx.organizationId, id),
    listSources(ctx.organizationId),
  ]);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={customer.contactPhone}
        action={
          <Button asChild>
            <Link href={`/orders/new?customerId=${customer.id}`}>Νέα Παραγγελία</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerDetailsCard customer={customer} sources={sources} />

        <Card>
          <CardHeader><CardTitle>Παραγγελίες ({customer.orders.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.orders.length === 0 ? (
              <p className="text-slate-500">Καμία παραγγελία</p>
            ) : (
              customer.orders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-lg border p-3 hover:bg-slate-50">
                  <p className="font-medium">{order.orderRef}</p>
                  <p className="text-slate-500">{formatDateTime(order.createdAt)} · {order.applications.length} αιτήσεις</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Leads ({customer.leads.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between rounded-lg border p-3 hover:bg-slate-50">
                <span>{lead.phone}</span>
                <span>{LEAD_STATUS_LABELS[lead.status]}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
