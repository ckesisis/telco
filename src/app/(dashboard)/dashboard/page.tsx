import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { requireAuthContext } from "@/lib/tenancy";
import { getDashboardStats } from "@/lib/services/reporting.service";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_LINE_LABELS } from "@/config/product-lines";

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());
  const stats = await getDashboardStats(ctx.organizationId, ctx, from, to);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${ctx.organizationName} — τρέχων μήνας`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/leads/new">Νέο Lead</Link>
            </Button>
            <Button asChild>
              <Link href="/orders/new">Νέα Παραγγελία</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads" value={stats.leadsCount} hint={`${stats.leadConversionRate}% conversion`} />
        <StatCard label="Πελάτες" value={stats.customersCount} />
        <StatCard label="Παραγγελίες" value={stats.ordersCount} />
        <StatCard label="Αιτήσεις" value={stats.appsCount} hint={`${stats.activationRate}% ενεργοποίηση`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Αιτήσεις ανά κατάσταση</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.appsByStatus.map((row) => (
              <div key={row.statusId} className="flex justify-between text-sm">
                <span>{row.statusName}</span>
                <span className="font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Αιτήσεις ανά γραμμή προϊόντος</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.appsByLine.map((row) => (
              <div key={row.productLine} className="flex justify-between text-sm">
                <span>{PRODUCT_LINE_LABELS[row.productLine as keyof typeof PRODUCT_LINE_LABELS]}</span>
                <span className="font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
