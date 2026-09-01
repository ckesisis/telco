import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { getApplication } from "@/lib/services/order.service";
import { listAppStatuses } from "@/lib/services/catalog.service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { APPLICATION_TYPE_LABELS } from "@/config/application-types";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { AppStatusSelect } from "@/components/shared/app-status-select";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const [app, statuses] = await Promise.all([
    getApplication(ctx.organizationId, id),
    listAppStatuses(ctx.organizationId),
  ]);
  if (!app) notFound();

  const snapshot = app.offerSnapshot as Record<string, unknown> | null;

  return (
    <div>
      <PageHeader
        title={PRODUCT_LINE_LABELS[app.productLine]}
        description={app.offer?.name ?? "—"}
        action={
          <Badge style={{ backgroundColor: app.status.color, color: "#fff" }}>
            {app.status.name}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Στοιχεία Αίτησης</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">MSISDN:</span> {app.msisdn ?? "—"}</p>
            <p>
              <span className="text-slate-500">Τύπος:</span>{" "}
              {app.applicationType ? APPLICATION_TYPE_LABELS[app.applicationType] : "—"}
            </p>
            {app.applicationType === "portability" && (
              <>
                <p><span className="text-slate-500">Αριθμός Φορητότητας:</span> {app.portingNumber ?? "—"}</p>
                <p><span className="text-slate-500">Προηγούμενος Πάροχος:</span> {app.previousProvider ?? "—"}</p>
              </>
            )}
            <p><span className="text-slate-500">Ποσό:</span> {formatCurrency(app.agreedMonthlyAmount?.toString())}</p>
            {snapshot && (
              <p className="text-slate-500">Snapshot: {String(snapshot.offerName)}</p>
            )}
            <div className="pt-2">
              <AppStatusSelect applicationId={app.id} currentStatusId={app.statusId} statuses={statuses} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Παραγγελία</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href={`/orders/${app.order.id}`} className="text-blue-600 hover:underline">
              {app.order.orderRef}
            </Link>
            <p>{app.order.customer.firstName} {app.order.customer.lastName}</p>
            <p className="text-slate-500">{formatDateTime(app.createdAt)}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Ιστορικό</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {app.logs.length === 0 ? (
              <p className="text-slate-500">Καμία εγγραφή</p>
            ) : (
              app.logs.map((log) => (
                <div key={log.id} className="flex justify-between border-b py-2">
                  <span>{log.message ?? log.action}</span>
                  <span className="text-slate-500">{formatDateTime(log.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
