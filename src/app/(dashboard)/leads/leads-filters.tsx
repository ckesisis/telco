"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function labelDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(day)}/${Number(month)}/${year}`;
}

export type LeadFilters = {
  q: string;
  status: string[];
  from: string;
  to: string;
  campaign: string;
};

const controlClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

export function leadsHref(
  filters: LeadFilters,
  page = 1,
  path = "/leads",
  extra?: Record<string, string>
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const id of filters.status) params.append("status", id);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.campaign) params.set("campaign", filters.campaign);
  if (page > 1) params.set("page", String(page));
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
    >
      {children}
      <X className="h-3 w-3" />
    </Link>
  );
}

export function LeadsFilters({
  filters,
  statuses,
  campaigns,
  actions,
  path = "/leads",
  extra,
}: {
  filters: LeadFilters;
  statuses: { id: string; name: string; color: string }[];
  campaigns: string[];
  actions?: React.ReactNode;
  path?: string;
  extra?: Record<string, string>;
}) {
  const href = (next: LeadFilters) => leadsHref(next, 1, path, extra);
  const clearHref = leadsHref({ q: "", status: [], from: "", to: "", campaign: "" }, 1, path, extra);
  const [selected, setSelected] = useState(filters.status);
  const selectedKey = filters.status.join(",");
  const [seenKey, setSeenKey] = useState(selectedKey);
  if (seenKey !== selectedKey) {
    setSeenKey(selectedKey);
    setSelected(filters.status);
  }
  const selectedStatuses = statuses.filter((item) => selected.includes(item.id));
  const statusLabel =
    selectedStatuses.length === 0
      ? "Όλες"
      : selectedStatuses.length === 1
        ? selectedStatuses[0].name
        : `${selectedStatuses.length} καταστάσεις`;
  const hasFilters = Boolean(
    filters.q || filters.status.length > 0 || filters.from || filters.to || filters.campaign
  );

  return (
    <form
      action={path}
      method="get"
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        for (const element of event.currentTarget.elements) {
          if (
            (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) &&
            !element.value
          ) {
            element.disabled = true;
          }
        }
      }}
    >
      {Object.entries(extra ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Αναζήτηση">
            <Input
              name="q"
              defaultValue={filters.q}
              placeholder="Τηλέφωνο, όνομα, email ή πηγή"
            />
          </Field>
        </div>
        {actions}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <span className="mb-1 block text-xs font-medium text-slate-500">Κατάσταση</span>
          {selected.map((id) => (
            <input key={id} type="hidden" name="status" value={id} />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={`${controlClass} flex items-center justify-between gap-2 text-left`}>
                <span className="truncate">{statusLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {statuses.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id]
                        )
                      }
                    />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Field label="Από">
          <Input type="date" name="from" defaultValue={filters.from} />
        </Field>
        <Field label="Έως">
          <Input type="date" name="to" defaultValue={filters.to} />
        </Field>
        <Field label="Campaign">
          <select name="campaign" defaultValue={filters.campaign} className={controlClass}>
            <option value="">Όλες</option>
            {filters.campaign && !campaigns.includes(filters.campaign) && (
              <option value={filters.campaign}>{filters.campaign}</option>
            )}
            {campaigns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {hasFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.q && (
            <Chip href={href({ ...filters, q: "" })}>Αναζήτηση: {filters.q}</Chip>
          )}
          {filters.status.map((id) => {
            const item = statuses.find((stage) => stage.id === id);
            if (!item) return null;
            return (
              <Chip key={id} href={href({ ...filters, status: filters.status.filter((value) => value !== id) })}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </Chip>
            );
          })}
          {filters.from && (
            <Chip href={href({ ...filters, from: "" })}>Από {labelDate(filters.from)}</Chip>
          )}
          {filters.to && (
            <Chip href={href({ ...filters, to: "" })}>Έως {labelDate(filters.to)}</Chip>
          )}
          {filters.campaign && (
            <Chip href={href({ ...filters, campaign: "" })}>{filters.campaign}</Chip>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {hasFilters && (
          <Button asChild variant="outline">
            <Link href={clearHref}>Καθαρισμός</Link>
          </Button>
        )}
        <Button type="submit">Εφαρμογή</Button>
      </div>
    </form>
  );
}
