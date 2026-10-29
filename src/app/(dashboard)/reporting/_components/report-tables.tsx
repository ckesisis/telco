import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, PhoneCall, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDuration, formatMinutes, formatNumber, formatPct } from "@/lib/reporting/format";
import type {
  AgentRow,
  AppBreakdownRow,
  BreakdownRow,
  CallKpis,
  SpeedKpis,
} from "@/lib/services/reporting.service";

// Reference palette: categorical slot 1 and its ordinal blue ramp.
const ACCENT = "#2a78d6";
const TRACK = "#eef2f7";

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

// ---------------------------------------------------------------------------
// Layout

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Remove body padding (for edge-to-edge tables). */
  flush?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("flex-1", flush ? "pb-2" : "px-5 pb-5")}>{children}</div>
    </Card>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-400">{children}</p>;
}

// ---------------------------------------------------------------------------
// Tables

type Column = { label: string; align?: "right"; className?: string };

function Table({
  columns,
  children,
  empty,
  minWidth = 520,
}: {
  columns: Column[];
  children: React.ReactNode;
  empty: boolean;
  minWidth?: number;
}) {
  if (empty) return <EmptyNote>Δεν υπάρχουν δεδομένα για την περίοδο</EmptyNote>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-500">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  "px-3 py-2 font-medium first:pl-5 last:pr-5",
                  column.align === "right" ? "text-right" : "text-left",
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({
  children,
  right,
  muted,
  strong,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 first:pl-5 last:pr-5",
        right && "text-right tabular-nums",
        muted && "text-slate-500",
        strong && "font-medium text-slate-900",
        className
      )}
    >
      {children}
    </td>
  );
}

/** Horizontal bar scaled against `max`; label stays in text ink beside it. */
function InlineBar({ value, max, label }: { value: number; max: number; label: string }) {
  const width = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-20 rounded-full sm:block" style={{ backgroundColor: TRACK }}>
        <div className="h-1.5 rounded-full" style={{ width: `${width}%`, backgroundColor: ACCENT }} />
      </div>
      <span className="w-12 text-right tabular-nums">{label}</span>
    </div>
  );
}

function Dot({ color }: { color?: string }) {
  if (!color) return null;
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

/**
 * Leads by a dimension.
 * - "volume": how many leads came from each (with share of total)
 * - "conversion": how well each converts to sales
 */
export function LeadBreakdownTable({
  rows,
  dimension,
  mode,
  limit = 8,
  showApps = false,
}: {
  rows: BreakdownRow[];
  dimension: string;
  mode: "volume" | "conversion";
  limit?: number;
  showApps?: boolean;
}) {
  const sorted =
    mode === "conversion"
      ? [...rows].sort((a, b) => b.sales - a.sales || b.saleRate - a.saleRate || b.leads - a.leads)
      : rows;
  const shown = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);
  const maxShare = Math.max(0, ...rows.map((row) => rate(row.leads, totalLeads)));
  const maxRate = Math.max(0, ...rows.map((row) => row.saleRate));
  const other = rest.reduce(
    (acc, row) => ({
      leads: acc.leads + row.leads,
      sales: acc.sales + row.sales,
      applied: acc.applied + row.applied,
      success: acc.success + row.success,
    }),
    { leads: 0, sales: 0, applied: 0, success: 0 }
  );

  const columns: Column[] =
    mode === "volume"
      ? [
          { label: dimension },
          { label: "Leads", align: "right" },
          { label: "Μερίδιο", align: "right" },
          { label: "Πωλήσεις", align: "right" },
        ]
      : [
          { label: dimension },
          { label: "Leads", align: "right" },
          { label: "Πωλήσεις", align: "right" },
          { label: "% Πώλησης", align: "right" },
          ...(showApps
            ? [
                { label: "Αιτήσεις", align: "right" as const },
                { label: "Επιτυχείς", align: "right" as const },
              ]
            : []),
        ];

  const renderRow = (
    key: string,
    label: React.ReactNode,
    data: { leads: number; sales: number; applied: number; success: number },
    muted = false
  ) => {
    const saleRate = rate(data.sales, data.leads);
    const share = rate(data.leads, totalLeads);
    return (
      <tr key={key} className={cn("hover:bg-slate-50/70", muted && "text-slate-500")}>
        <Cell className="max-w-[240px]">{label}</Cell>
        {mode === "volume" ? (
          <>
            <Cell right strong={!muted}>
              {formatNumber(data.leads)}
            </Cell>
            <Cell right>
              <InlineBar value={share} max={maxShare} label={formatPct(share)} />
            </Cell>
            <Cell right muted>
              {formatNumber(data.sales)}
            </Cell>
          </>
        ) : (
          <>
            <Cell right muted>
              {formatNumber(data.leads)}
            </Cell>
            <Cell right strong={!muted}>
              {formatNumber(data.sales)}
            </Cell>
            <Cell right>
              <InlineBar value={saleRate} max={maxRate} label={formatPct(saleRate)} />
            </Cell>
            {showApps && (
              <>
                <Cell right muted>
                  {formatNumber(data.applied)}
                </Cell>
                <Cell right muted>
                  {formatNumber(data.success)}
                </Cell>
              </>
            )}
          </>
        )}
      </tr>
    );
  };

  return (
    <Table columns={columns} empty={rows.length === 0}>
      {shown.map((row) =>
        renderRow(
          row.key,
          <span className="flex min-w-0 items-center gap-2">
            <Dot color={row.color} />
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
          </span>,
          row
        )
      )}
      {rest.length > 0 && renderRow("__other", `Λοιπά (${rest.length})`, other, true)}
    </Table>
  );
}

export function AppBreakdownTable({ rows, dimension }: { rows: AppBreakdownRow[]; dimension: string }) {
  const maxRate = Math.max(0, ...rows.map((row) => row.successRate));
  return (
    <Table
      empty={rows.length === 0}
      minWidth={420}
      columns={[
        { label: dimension },
        { label: "Αιτήσεις", align: "right" },
        { label: "Επιτυχείς", align: "right" },
        { label: "% Επιτυχίας", align: "right" },
      ]}
    >
      {rows.map((row) => (
        <tr key={row.key} className="hover:bg-slate-50/70">
          <Cell>{row.label}</Cell>
          <Cell right strong>
            {formatNumber(row.apps)}
          </Cell>
          <Cell right muted>
            {formatNumber(row.success)}
          </Cell>
          <Cell right>
            <InlineBar value={row.successRate} max={maxRate} label={formatPct(row.successRate)} />
          </Cell>
        </tr>
      ))}
    </Table>
  );
}

export function CallAgentTable({ rows }: { rows: ({ key: string; label: string } & CallKpis)[] }) {
  const maxTalk = Math.max(0, ...rows.map((row) => row.talkSeconds));
  return (
    <Table
      empty={rows.length === 0}
      minWidth={760}
      columns={[
        { label: "Agent" },
        { label: "Σύνολο", align: "right" },
        { label: "Εισερχ.", align: "right" },
        { label: "Εξερχ.", align: "right" },
        { label: "Αναπάντητες", align: "right" },
        { label: "% Απάντησης", align: "right" },
        { label: "Χρόνος ομιλίας", align: "right" },
        { label: "Μ.Ο. κλήσης", align: "right" },
      ]}
    >
      {rows.map((row) => (
        <tr key={row.key} className="hover:bg-slate-50/70">
          <Cell strong>{row.label}</Cell>
          <Cell right strong>
            {formatNumber(row.total)}
          </Cell>
          <Cell right muted>
            {formatNumber(row.incoming)}
          </Cell>
          <Cell right muted>
            {formatNumber(row.outgoing)}
          </Cell>
          <Cell right muted>
            {formatNumber(row.missed)}
          </Cell>
          <Cell right>{row.incoming ? formatPct(row.answerRate) : "—"}</Cell>
          <Cell right>
            <div className="flex items-center justify-end gap-2">
              <div className="hidden h-1.5 w-16 rounded-full sm:block" style={{ backgroundColor: TRACK }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${maxTalk ? (row.talkSeconds / maxTalk) * 100 : 0}%`,
                    backgroundColor: ACCENT,
                  }}
                />
              </div>
              <span className="w-16 text-right">{formatDuration(row.talkSeconds)}</span>
            </div>
          </Cell>
          <Cell right muted>
            {formatDuration(row.avgTalkSeconds)}
          </Cell>
        </tr>
      ))}
    </Table>
  );
}

export function AgentLeaderboard({
  rows,
  limit,
  agentHref,
  showApps = false,
}: {
  rows: AgentRow[];
  limit?: number;
  agentHref?: (userId: string) => string;
  showApps?: boolean;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const maxRate = Math.max(0, ...rows.map((row) => row.saleRate));
  return (
    <Table
      empty={rows.length === 0}
      minWidth={860}
      columns={[
        { label: "#", className: "w-10" },
        { label: "Agent" },
        { label: "Leads", align: "right" },
        { label: "Πωλήσεις", align: "right" },
        { label: "% Πώλησης", align: "right" },
        ...(showApps
          ? [
              { label: "Αιτήσεις", align: "right" as const },
              { label: "Επιτυχείς", align: "right" as const },
            ]
          : []),
        { label: "Κλήσεις", align: "right" },
        { label: "Αναπάντητες", align: "right" },
        { label: "Ομιλία", align: "right" },
        { label: "Speed to lead", align: "right" },
      ]}
    >
      {shown.map((row, i) => (
        <tr key={row.userId} className="hover:bg-slate-50/70">
          <Cell>
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                i === 0 && row.sales > 0 ? "bg-slate-900 font-semibold text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              {i + 1}
            </span>
          </Cell>
          <Cell strong>
            {agentHref ? (
              <Link href={agentHref(row.userId)} className="hover:underline" title="Φιλτράρισμα σε αυτόν τον agent">
                {row.name}
              </Link>
            ) : (
              row.name
            )}
          </Cell>
          <Cell right muted>
            {formatNumber(row.leads)}
          </Cell>
          <Cell right strong>
            {formatNumber(row.sales)}
          </Cell>
          <Cell right>
            {row.leads ? <InlineBar value={row.saleRate} max={maxRate} label={formatPct(row.saleRate)} /> : "—"}
          </Cell>
          {showApps && (
            <>
              <Cell right muted>
                {formatNumber(row.applied)}
              </Cell>
              <Cell right muted>
                {formatNumber(row.success)}
              </Cell>
            </>
          )}
          <Cell right muted>
            {formatNumber(row.calls)}
          </Cell>
          <Cell right muted>
            {formatNumber(row.missed)}
          </Cell>
          <Cell right muted>
            {formatDuration(row.talkSeconds)}
          </Cell>
          <Cell right>{formatMinutes(row.medianSpeedMinutes)}</Cell>
        </tr>
      ))}
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Panels

export function StageList({ rows }: { rows: { key: string; label: string; color?: string; count: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(0, ...rows.map((row) => row.count));
  if (rows.length === 0) return <EmptyNote>Δεν υπάρχουν δεδομένα</EmptyNote>;
  return (
    <ul className="space-y-2">
      {[...rows]
        .sort((a, b) => b.count - a.count)
        .map((row) => (
          <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={row.color ?? "#94a3b8"} />
              <span className="truncate" title={row.label}>
                {row.label}
              </span>
            </span>
            <span className="tabular-nums text-slate-900">
              {formatNumber(row.count)}
              <span className="ml-1.5 inline-block w-11 text-right text-xs text-slate-400">
                {formatPct(rate(row.count, total))}
              </span>
            </span>
            <div className="col-span-2 mt-1 h-1.5 rounded-full" style={{ backgroundColor: TRACK }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${max ? (row.count / max) * 100 : 0}%`, backgroundColor: ACCENT }}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}

export function Funnel({
  leads,
  sales,
  applied,
  success,
  showApps,
}: {
  leads: number;
  sales: number;
  applied: number;
  success: number;
  showApps: boolean;
}) {
  const steps = [
    { label: "Leads", value: leads },
    { label: "Πωλήσεις", sub: "κατάσταση «Μετατράπηκε»", value: sales },
    ...(showApps
      ? [
          { label: "Καταχωρημένη αίτηση", value: applied },
          { label: "Επιτυχημένη αίτηση", value: success },
        ]
      : []),
  ];
  return (
    <div>
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const prev = i > 0 ? steps[i - 1].value : null;
          return (
            <li key={step.label}>
              {prev != null && (
                <div className="flex items-center gap-1.5 py-1 pl-1 text-xs text-slate-500">
                  <ArrowRight className="h-3 w-3 rotate-90" aria-hidden />
                  <span className="tabular-nums font-medium text-slate-700">{formatPct(rate(step.value, prev))}</span>
                  <span>μετατροπή</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-slate-700">
                  {step.label}
                  {step.sub && <span className="ml-1 text-xs text-slate-400">{step.sub}</span>}
                </span>
                <span className="text-xl font-semibold text-slate-900">{formatNumber(step.value)}</span>
              </div>
              <div className="mt-1 h-2.5 rounded" style={{ backgroundColor: TRACK }}>
                <div
                  className="h-2.5 rounded"
                  style={{
                    width: `${leads ? Math.max(step.value ? 1.5 : 0, (step.value / leads) * 100) : 0}%`,
                    backgroundColor: ACCENT,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {!showApps && (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Οι αιτήσεις θα προστεθούν στο funnel μόλις αρχίσουν να καταχωρούνται παραγγελίες από τα leads.
        </p>
      )}
    </div>
  );
}

/** Part-to-whole of response times; fastest bucket darkest (ordinal blue ramp). */
export function SpeedDistribution({ speed }: { speed: SpeedKpis }) {
  const segments = [
    { label: "≤ 15 λεπτά", pct: speed.within15Pct, color: "#104281" },
    { label: "15–60 λεπτά", pct: speed.within60Pct - speed.within15Pct, color: "#256abf" },
    { label: "1–24 ώρες", pct: speed.within1440Pct - speed.within60Pct, color: "#5598e7" },
    {
      label: "> 24 ώρες",
      pct: Math.max(0, 100 - speed.notCalledPct - speed.within1440Pct),
      color: "#86b6ef",
    },
    { label: "Χωρίς κλήση", pct: speed.notCalledPct, color: "#cbd5e1" },
  ].map((segment) => ({ ...segment, pct: Math.max(0, Math.round(segment.pct * 10) / 10) }));

  if (speed.leads === 0) return <EmptyNote>Δεν υπάρχουν leads στην περίοδο</EmptyNote>;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-tight text-slate-900">
          {formatMinutes(speed.medianMinutes)}
        </span>
        <span className="text-sm text-slate-500">διάμεσος χρόνος 1ης κλήσης</span>
      </div>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded" role="img" aria-label="Κατανομή χρόνου 1ης κλήσης">
        {segments
          .filter((segment) => segment.pct > 0)
          .map((segment) => (
            <div
              key={segment.label}
              className="h-full first:rounded-l last:rounded-r"
              style={{ width: `${segment.pct}%`, backgroundColor: segment.color }}
              title={`${segment.label}: ${formatPct(segment.pct)}`}
            />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="tabular-nums text-slate-900">{formatPct(segment.pct)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        {formatNumber(speed.called)} από {formatNumber(speed.leads)} leads κλήθηκαν εντός 7 ημερών
      </p>
    </div>
  );
}

/** Operational counts that need follow-up, independent of the selected period. */
export function ActionPanel({
  overdueCallbacks,
  stale,
  staleDays,
  unassignedOpen,
  open,
  showUnassigned,
}: {
  overdueCallbacks: number;
  stale: number;
  staleDays: number;
  unassignedOpen: number;
  open: number;
  showUnassigned: boolean;
}) {
  const items = [
    {
      icon: PhoneCall,
      label: "Ληξιπρόθεσμα callbacks",
      value: overdueCallbacks,
      href: "/leads/calls",
      cta: "Προς κλήση",
    },
    {
      icon: Clock,
      label: `Χωρίς ενέργεια > ${staleDays} ημέρες`,
      value: stale,
      href: "/leads",
      cta: "Leads",
    },
    ...(showUnassigned
      ? [{ icon: UserX, label: "Χωρίς ανάθεση", value: unassignedOpen, href: "/leads", cta: "Leads" }]
      : []),
  ];
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const Icon = item.icon;
          const attention = item.value > 0;
          return (
            <li key={item.label} className="flex items-center gap-3 py-2.5 first:pt-0">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  attention ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"
                )}
              >
                {attention ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1 text-sm text-slate-600">{item.label}</span>
              <span className={cn("text-lg font-semibold tabular-nums", attention ? "text-slate-900" : "text-slate-400")}>
                {formatNumber(item.value)}
              </span>
              <Link
                href={item.href}
                className="hidden text-xs text-slate-500 hover:text-slate-900 hover:underline sm:inline"
              >
                {item.cta} →
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-slate-100 pt-2.5 text-xs text-slate-400">
        {formatNumber(open)} ανοιχτά leads συνολικά · τρέχουσα εικόνα, ανεξάρτητα από την περίοδο
      </p>
    </div>
  );
}
