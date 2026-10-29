import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { getReport } from "@/lib/services/reporting.service";
import { parseReportFilters, reportHref } from "@/lib/reporting/filters";
import { formatDuration, formatMinutes, formatNumber, formatPct } from "@/lib/reporting/format";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard, KpiStrip } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { TrendChart } from "../reporting/_components/trend-chart";
import { AgentLeaderboard, SectionCard } from "../reporting/_components/report-tables";

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const filters = parseReportFilters({}, ctx);
  const report = await getReport(ctx, filters);
  const { current: cur, previous: prev } = report;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${ctx.organizationName} — τρέχων μήνας (${report.period.label})`}
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

      <KpiStrip>
        <KpiCard
          bare
          label="Νέα leads"
          value={formatNumber(cur.leads)}
          current={cur.leads}
          previous={prev.leads}
          spark={report.trend.points.map((p) => p.leads)}
        />
        <KpiCard
          bare
          label="Πωλήσεις"
          info="Leads του μήνα σε κατάσταση «Μετατράπηκε»."
          value={formatNumber(cur.sales)}
          current={cur.sales}
          previous={prev.sales}
          spark={report.trend.points.map((p) => p.sales)}
        />
        <KpiCard
          bare
          label="Lead → Πώληση"
          value={formatPct(cur.saleRate)}
          current={cur.saleRate}
          previous={prev.saleRate}
          deltaMode="points"
        />
        <KpiCard
          bare
          label="Speed to lead"
          info="Διάμεσος χρόνος έως την 1η εξερχόμενη κλήση."
          value={formatMinutes(cur.speed.medianMinutes)}
          current={cur.speed.medianMinutes}
          previous={prev.speed.medianMinutes}
          lowerIsBetter
        />
        <KpiCard
          bare
          label="Κλήσεις"
          value={formatNumber(cur.calls.total)}
          hint={`${formatDuration(cur.calls.talkSeconds)} ομιλία`}
          current={cur.calls.total}
          previous={prev.calls.total}
          spark={report.trend.points.map((p) => p.incoming + p.outgoing)}
        />
        <KpiCard
          bare
          label="Ληξιπρόθεσμα callbacks"
          value={formatNumber(report.leads.pipeline.overdueCallbacks)}
          hint={`${formatNumber(report.leads.pipeline.open)} ανοιχτά leads`}
        />
      </KpiStrip>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TrendChart
          title="Leads & πωλήσεις"
          points={report.trend.points}
          granularity={report.trend.granularity}
          series={[
            { key: "leads", label: "Leads" },
            { key: "sales", label: "Πωλήσεις" },
            ...(report.hasApplications ? [{ key: "applications" as const, label: "Αιτήσεις" }] : []),
          ]}
        />
        <TrendChart
          title="Κλήσεις"
          points={report.trend.points}
          granularity={report.trend.granularity}
          series={[
            { key: "incoming", label: "Εισερχόμενες" },
            { key: "outgoing", label: "Εξερχόμενες" },
            { key: "missed", label: "Αναπάντητες" },
          ]}
        />
      </div>

      {report.leaderboard && (
        <SectionCard className="mt-5" title="Top agents του μήνα" flush>
          <AgentLeaderboard
            rows={report.leaderboard}
            limit={5}
            showApps={report.hasApplications}
            agentHref={(userId) => reportHref({ ...filters, agentId: userId })}
          />
        </SectionCard>
      )}

      <div className="mt-4 text-right">
        <Link href="/reporting" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Αναλυτικές αναφορές →
        </Link>
      </div>
    </div>
  );
}
