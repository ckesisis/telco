import { startOfMonth, endOfMonth } from "date-fns";
import { requireAuthContext } from "@/lib/tenancy";
import { getDashboardStats } from "@/lib/services/reporting.service";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";
import { ReportingExport } from "./reporting-export";

export default async function ReportingPage() {
  const ctx = await requireAuthContext();
  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());
  const stats = await getDashboardStats(ctx.organizationId, ctx, from, to);

  return (
    <div>
      <PageHeader
        title="Αναφορές"
        description="Βασικές αναφορές για τον τρέχοντα μήνα"
        action={<ReportingExport stats={stats} />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads" value={stats.leadsCount} hint={`${stats.leadConversionRate}% conversion`} />
        <StatCard label="Πελάτες" value={stats.customersCount} />
        <StatCard label="Παραγγελίες" value={stats.ordersCount} />
        <StatCard label="Ενεργοποίηση" value={`${stats.activationRate}%`} hint={`${stats.activatedApps}/${stats.appsCount} αιτήσεις`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Ανά Κατάσταση</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.appsByStatus.map((r) => (
              <div key={r.statusId} className="flex justify-between">
                <span>{r.statusName}</span><span className="font-medium">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ανά Γραμμή</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.appsByLine.map((r) => (
              <div key={r.productLine} className="flex justify-between">
                <span>{PRODUCT_LINE_LABELS[r.productLine as keyof typeof PRODUCT_LINE_LABELS]}</span>
                <span className="font-medium">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ανά Πηγή</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.appsBySource.map((r) => (
              <div key={r.sourceId ?? "none"} className="flex justify-between">
                <span>{r.sourceName}</span><span className="font-medium">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
