import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { getReport } from "@/lib/services/reporting.service";
import {
  REPORT_TIME_ZONE,
  athensDay,
  parseReportFilters,
  reportHref,
  type ReportTab,
} from "@/lib/reporting/filters";
import { formatDuration, formatMinutes, formatNumber, formatPct } from "@/lib/reporting/format";
import { KpiCard, KpiStrip } from "@/components/shared/kpi-card";
import { cn } from "@/lib/utils";
import { ReportingExport } from "./reporting-export";
import { ReportingFilters } from "./_components/reporting-filters";
import { TrendChart } from "./_components/trend-chart";
import {
  ActionPanel,
  AgentLeaderboard,
  AppBreakdownTable,
  CallAgentTable,
  Funnel,
  LeadBreakdownTable,
  SectionCard,
  SectionHeading,
  SpeedDistribution,
  StageList,
} from "./_components/report-tables";

const TABS: { key: ReportTab; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "conversion", label: "Πωλήσεις" },
  { key: "calls", label: "Κλήσεις" },
];

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  const filters = parseReportFilters(await searchParams, ctx);
  const report = await getReport(ctx, filters);
  const { current: cur, previous: prev, trend } = report;
  const points = trend.points;
  const showApps = report.hasApplications;
  const callsFiltered = Boolean(filters.sourceId || filters.campaign || filters.productLine);
  const updatedAt = new Intl.DateTimeFormat("el-GR", {
    timeZone: REPORT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(report.generatedAt));

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Αναφορές</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{report.period.label}</span>
            <span aria-hidden>·</span>
            <span>σύγκριση με {report.period.previousLabel}</span>
            {!ctx.isAdmin && (
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs text-slate-600">
                Μόνο τα δικά σας δεδομένα
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:inline">Ενημερώθηκε {updatedAt}</span>
          <ReportingExport report={report} />
        </div>
      </div>

      <ReportingFilters
        filters={filters}
        agents={report.options.agents}
        sources={report.options.sources}
        campaigns={report.options.campaigns}
        isAdmin={ctx.isAdmin}
        today={athensDay(new Date())}
        showProductLine={showApps}
      />

      {/* Headline scorecard */}
      <KpiStrip>
        <KpiCard
          bare
          label="Νέα leads"
          info="Leads που δημιουργήθηκαν μέσα στην περίοδο."
          value={formatNumber(cur.leads)}
          current={cur.leads}
          previous={prev.leads}
          spark={points.map((p) => p.leads)}
        />
        <KpiCard
          bare
          label="Πωλήσεις"
          info="Leads της περιόδου που βρίσκονται σε κατάσταση «Μετατράπηκε»."
          value={formatNumber(cur.sales)}
          current={cur.sales}
          previous={prev.sales}
          spark={points.map((p) => p.sales)}
        />
        <KpiCard
          bare
          label="Lead → Πώληση"
          info="Πωλήσεις ÷ νέα leads της περιόδου."
          value={formatPct(cur.saleRate)}
          current={cur.saleRate}
          previous={prev.saleRate}
          deltaMode="points"
          spark={points.map((p) => (p.leads ? (p.sales / p.leads) * 100 : 0))}
        />
        <KpiCard
          bare
          label="Speed to lead"
          info="Διάμεσος χρόνος από τη δημιουργία του lead έως την 1η εξερχόμενη κλήση (έως 7 ημέρες)."
          value={formatMinutes(cur.speed.medianMinutes)}
          hint={`${formatPct(cur.speed.within60Pct)} εντός 1 ώρας`}
          current={cur.speed.medianMinutes}
          previous={prev.speed.medianMinutes}
          lowerIsBetter
        />
        <KpiCard
          bare
          label="Κλήσεις"
          info="Εισερχόμενες και εξερχόμενες κλήσεις από το τηλεφωνικό σύστημα."
          value={formatNumber(cur.calls.total)}
          hint={`${formatDuration(cur.calls.talkSeconds)} ομιλία`}
          current={cur.calls.total}
          previous={prev.calls.total}
          spark={points.map((p) => p.incoming + p.outgoing)}
        />
        <KpiCard
          bare
          label="Απάντηση εισερχομένων"
          info="Εισερχόμενες κλήσεις που απαντήθηκαν ÷ σύνολο εισερχομένων."
          value={cur.calls.incoming ? formatPct(cur.calls.answerRate) : "—"}
          hint={`${formatNumber(cur.calls.missed)} αναπάντητες`}
          current={cur.calls.incoming ? cur.calls.answerRate : null}
          previous={prev.calls.incoming ? prev.calls.answerRate : null}
          deltaMode="points"
        />
      </KpiStrip>

      {/* Tabs */}
      <nav className="mt-8 mb-5 flex gap-6 border-b border-slate-200" aria-label="Ενότητες αναφοράς">
        {TABS.map((tab) => {
          const active = filters.tab === tab.key;
          return (
            <Link
              key={tab.key}
              href={reportHref({ ...filters, tab: tab.key })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {filters.tab === "leads" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart
              title="Νέα leads"
              points={points}
              granularity={trend.granularity}
              series={[{ key: "leads", label: "Leads" }]}
            />
          </div>
          <SectionCard title="Χρειάζονται ενέργεια" description="Ανοιχτά leads που περιμένουν follow-up">
            <ActionPanel
              overdueCallbacks={report.leads.pipeline.overdueCallbacks}
              stale={report.leads.pipeline.stale}
              staleDays={report.leads.pipeline.staleDays}
              unassignedOpen={report.leads.pipeline.unassignedOpen}
              open={report.leads.pipeline.open}
              showUnassigned={ctx.isAdmin && !filters.agentId}
            />
          </SectionCard>

          <SectionCard title="Speed to lead" description="Χρόνος έως την 1η εξερχόμενη κλήση, από οποιονδήποτε agent">
            <SpeedDistribution speed={cur.speed} />
          </SectionCard>
          <SectionCard
            className="lg:col-span-2"
            title="Κατάσταση leads"
            description="Τρέχουσα κατάσταση των leads που δημιουργήθηκαν στην περίοδο"
          >
            <StageList rows={report.leads.byStage} />
          </SectionCard>

          <div className="grid gap-5 lg:col-span-3 lg:grid-cols-2">
            <SectionCard title="Leads ανά πηγή" flush>
              <LeadBreakdownTable mode="volume" rows={report.leads.bySource} dimension="Πηγή" />
            </SectionCard>
            <SectionCard title="Leads ανά campaign" flush>
              <LeadBreakdownTable mode="volume" rows={report.leads.byCampaign} dimension="Campaign" />
            </SectionCard>
          </div>
        </div>
      )}

      {filters.tab === "conversion" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard title="Funnel πωλήσεων" description="Leads της περιόδου και πού έφτασαν">
            <Funnel
              leads={cur.leads}
              sales={cur.sales}
              applied={cur.applied}
              success={cur.success}
              showApps={showApps}
            />
          </SectionCard>
          <div className="lg:col-span-2">
            <TrendChart
              title="Leads & πωλήσεις"
              points={points}
              granularity={trend.granularity}
              series={[
                { key: "leads", label: "Leads" },
                { key: "sales", label: "Πωλήσεις" },
                ...(showApps ? [{ key: "applications" as const, label: "Αιτήσεις" }] : []),
              ]}
              footnote="Οι πωλήσεις μετρώνται στην ημέρα δημιουργίας του lead."
            />
          </div>

          <div className="grid gap-5 lg:col-span-3 lg:grid-cols-2">
            <SectionCard title="Μετατροπή ανά πηγή" description="Ταξινόμηση κατά πωλήσεις" flush>
              <LeadBreakdownTable mode="conversion" rows={report.leads.bySource} dimension="Πηγή" showApps={showApps} />
            </SectionCard>
            <SectionCard title="Μετατροπή ανά campaign" description="Ταξινόμηση κατά πωλήσεις" flush>
              <LeadBreakdownTable
                mode="conversion"
                rows={report.leads.byCampaign}
                dimension="Campaign"
                showApps={showApps}
              />
            </SectionCard>
            {showApps && (
              <>
                <SectionCard title="Αιτήσεις ανά γραμμή προϊόντος" flush>
                  <AppBreakdownTable rows={report.conversion.byProductLine} dimension="Γραμμή" />
                </SectionCard>
                <SectionCard title="Αιτήσεις ανά τύπο" flush>
                  <AppBreakdownTable rows={report.conversion.byAppType} dimension="Τύπος" />
                </SectionCard>
              </>
            )}
          </div>
        </div>
      )}

      {filters.tab === "calls" && (
        <div className="space-y-5">
          {callsFiltered && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Τα φίλτρα πηγής, campaign και γραμμής προϊόντος δεν εφαρμόζονται στις κλήσεις.
            </p>
          )}
          <KpiStrip>
            <KpiCard
              bare
              label="Εισερχόμενες"
              value={formatNumber(cur.calls.incoming)}
              current={cur.calls.incoming}
              previous={prev.calls.incoming}
              spark={points.map((p) => p.incoming)}
            />
            <KpiCard
              bare
              label="Εξερχόμενες"
              value={formatNumber(cur.calls.outgoing)}
              current={cur.calls.outgoing}
              previous={prev.calls.outgoing}
              spark={points.map((p) => p.outgoing)}
            />
            <KpiCard
              bare
              label="Αναπάντητες"
              info="Κλήσεις με κατάσταση «αναπάντητη» (εισερχόμενες και εξερχόμενες)."
              value={formatNumber(cur.calls.missed)}
              current={cur.calls.missed}
              previous={prev.calls.missed}
              lowerIsBetter
              spark={points.map((p) => p.missed)}
            />
            <KpiCard
              bare
              label="Απάντηση εισερχομένων"
              value={cur.calls.incoming ? formatPct(cur.calls.answerRate) : "—"}
              current={cur.calls.incoming ? cur.calls.answerRate : null}
              previous={prev.calls.incoming ? prev.calls.answerRate : null}
              deltaMode="points"
            />
            <KpiCard
              bare
              label="Χρόνος ομιλίας"
              info="Άθροισμα διάρκειας απαντημένων κλήσεων."
              value={formatDuration(cur.calls.talkSeconds)}
              current={cur.calls.talkSeconds}
              previous={prev.calls.talkSeconds}
            />
            <KpiCard
              bare
              label="Μ.Ο. διάρκειας"
              info="Μέση διάρκεια των κλήσεων με ομιλία."
              value={formatDuration(cur.calls.avgTalkSeconds)}
              hint={`${formatNumber(cur.calls.connectedCalls)} κλήσεις με ομιλία`}
              current={cur.calls.avgTalkSeconds}
              previous={prev.calls.avgTalkSeconds}
            />
          </KpiStrip>
          <TrendChart
            title="Όγκος κλήσεων"
            points={points}
            granularity={trend.granularity}
            height={260}
            series={[
              { key: "incoming", label: "Εισερχόμενες" },
              { key: "outgoing", label: "Εξερχόμενες" },
              { key: "missed", label: "Αναπάντητες" },
            ]}
          />
          <SectionCard
            title="Κλήσεις ανά agent"
            description="Ο agent αναγνωρίζεται από το τηλέφωνο επικοινωνίας στο προφίλ του"
            flush
          >
            <CallAgentTable rows={report.calls.byAgent} />
          </SectionCard>
        </div>
      )}

      {report.leaderboard && (
        <section className="mt-10">
          <SectionHeading
            title="Απόδοση agents"
            description="Leads που ανατέθηκαν στην περίοδο, πωλήσεις, κλήσεις και χρόνος απόκρισης. Επιλέξτε όνομα για φιλτράρισμα."
          />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white pb-2 shadow-sm">
            <AgentLeaderboard
              rows={report.leaderboard}
              showApps={showApps}
              agentHref={(userId) => reportHref({ ...filters, agentId: userId })}
            />
          </div>
        </section>
      )}
    </div>
  );
}
