"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { PRODUCT_LINE_LABELS, PRODUCT_LINES } from "@/config/product-lines";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { reportHref, type ReportFilters } from "@/lib/reporting/filters";
import { cn } from "@/lib/utils";

const UNASSIGNED = "unassigned";

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-9 max-w-[220px] min-w-0 truncate rounded-md border bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        value ? "border-slate-900 font-medium text-slate-900" : "border-slate-200 text-slate-600"
      )}
    >
      <option value="">{allLabel}</option>
      {value && !options.some((option) => option.value === value) && <option value={value}>{value}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Sticky toolbar. Every change navigates immediately (client-side), so there is
 * no "apply" step; the current view stays visible while the next one loads.
 */
export function ReportingFilters({
  filters,
  agents,
  sources,
  campaigns,
  isAdmin,
  today,
  showProductLine = true,
}: {
  filters: ReportFilters;
  agents: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  campaigns: string[];
  isAdmin: boolean;
  /** Current day (YYYY-MM-DD) in Athens time, from the server. */
  today: string;
  /** Product line only applies to applications, so it is hidden until they exist. */
  showProductLine?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href, { scroll: false }));
  const go = (next: Partial<ReportFilters>) => navigate(reportHref({ ...filters, ...next }));
  const hasFilters = Boolean(
    filters.preset !== "month" || filters.agentId || filters.sourceId || filters.campaign || filters.productLine
  );

  return (
    <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-slate-200 bg-slate-50/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-[320px]">
          <DateRangePicker
            value={{ preset: filters.preset, from: filters.from, to: filters.to }}
            today={today}
            className="h-9"
            onApply={(range) => go(range)}
          />
        </div>
        {isAdmin && (
          <FilterSelect
            label="Agent"
            value={filters.agentId}
            onChange={(agentId) => go({ agentId })}
            allLabel="Όλοι οι agents"
            options={[
              { value: UNASSIGNED, label: "Χωρίς ανάθεση" },
              ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
            ]}
          />
        )}
        <FilterSelect
          label="Πηγή"
          value={filters.sourceId}
          onChange={(sourceId) => go({ sourceId })}
          allLabel="Όλες οι πηγές"
          options={sources.map((source) => ({ value: source.id, label: source.name }))}
        />
        <FilterSelect
          label="Campaign"
          value={filters.campaign}
          onChange={(campaign) => go({ campaign })}
          allLabel="Όλα τα campaigns"
          options={campaigns.map((name) => ({ value: name, label: name }))}
        />
        {(showProductLine || filters.productLine) && (
          <FilterSelect
            label="Γραμμή προϊόντος"
            value={filters.productLine}
            onChange={(productLine) => go({ productLine: productLine as ReportFilters["productLine"] })}
            allLabel="Όλες οι γραμμές"
            options={PRODUCT_LINES.map((line) => ({ value: line, label: PRODUCT_LINE_LABELS[line] }))}
          />
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={() => navigate(reportHref({ tab: filters.tab }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Επαναφορά
          </button>
        )}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 transition-opacity",
            pending ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {pending ? "Ενημέρωση…" : ""}
        </span>
      </div>
    </div>
  );
}
