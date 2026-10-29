import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * KPI tile: label, value, delta vs the previous period and an optional sparkline.
 * `lowerIsBetter` flips the good/bad colouring (e.g. missed calls, response time).
 * `bare` renders without the card frame, for use inside <KpiStrip>.
 */
export function KpiCard({
  label,
  value,
  hint,
  info,
  current,
  previous,
  lowerIsBetter = false,
  deltaMode = "percent",
  spark,
  bare = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Metric definition, shown on hover over the info icon. */
  info?: string;
  current?: number | null;
  previous?: number | null;
  lowerIsBetter?: boolean;
  /** "percent" = relative change, "points" = absolute change for values that are already % */
  deltaMode?: "percent" | "points";
  spark?: number[];
  bare?: boolean;
}) {
  const delta = deltaOf(current, previous, deltaMode);
  const body = (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-1 text-sm text-slate-500">
        <span className="truncate">{label}</span>
        {info && (
          <span title={info} className="cursor-help text-slate-300 hover:text-slate-500">
            <Info className="h-3.5 w-3.5" aria-label={info} />
          </span>
        )}
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-[28px] font-semibold leading-tight text-slate-900">{value}</p>
        {spark && spark.length > 1 && <Sparkline values={spark} />}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-1.5 text-xs">
        {delta ? (
          <>
            <Delta delta={delta} lowerIsBetter={lowerIsBetter} />
            <span className="text-slate-400">vs προηγ. περίοδο</span>
          </>
        ) : (
          hint && <span className="text-slate-400">{hint}</span>
        )}
      </div>
      {delta && hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );

  return bare ? body : <Card>{body}</Card>;
}

/** One framed panel holding several KPI tiles separated by hairlines. */
export function KpiStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-3 xl:grid-cols-6 [&>*]:bg-white">
        {children}
      </div>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 72;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const y = (value: number) => height - 3 - ((value - min) / span) * (height - 6);
  const line = values.map((value, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(value).toFixed(1)}`).join("");
  const lastX = (values.length - 1) * step;
  const lastY = y(values[values.length - 1]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mb-1 shrink-0" aria-hidden>
      <path d={`${line}L${lastX},${height}L0,${height}Z`} fill="#2a78d6" opacity={0.08} />
      <path d={line} fill="none" stroke="#86b6ef" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill="#2a78d6" />
    </svg>
  );
}

type DeltaValue = { value: number; text: string };

function deltaOf(
  current: number | null | undefined,
  previous: number | null | undefined,
  mode: "percent" | "points"
): DeltaValue | null {
  if (current == null || previous == null) return null;
  if (mode === "points") {
    const value = Math.round((current - previous) * 10) / 10;
    return { value, text: `${value > 0 ? "+" : ""}${value.toLocaleString("el-GR")} μον.` };
  }
  if (previous === 0) {
    return current === 0 ? { value: 0, text: "0%" } : { value: 1, text: "νέο" };
  }
  const value = Math.round(((current - previous) / previous) * 100);
  return { value, text: `${value > 0 ? "+" : ""}${value}%` };
}

function Delta({ delta, lowerIsBetter }: { delta: DeltaValue; lowerIsBetter: boolean }) {
  const good = lowerIsBetter ? delta.value < 0 : delta.value > 0;
  const Icon = delta.value > 0 ? ArrowUpRight : delta.value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium tabular-nums",
        delta.value === 0
          ? "bg-slate-100 text-slate-600"
          : good
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {delta.text}
    </span>
  );
}
