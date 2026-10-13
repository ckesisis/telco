"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callsHref, type CallListFilters } from "./calls-href";

const controlClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

function labelDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(day)}/${Number(month)}/${year}`;
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

export function CallsFilters({
  filters,
  statuses,
  directions,
}: {
  filters: CallListFilters;
  statuses: { value: string; label: string }[];
  directions: { value: string; label: string }[];
}) {
  const statusLabel = statuses.find((item) => item.value === filters.status)?.label;
  const directionLabel = directions.find((item) => item.value === filters.direction)?.label;
  const hasFilters = Boolean(
    filters.q || filters.status || filters.direction || filters.from || filters.to
  );

  return (
    <form
      action="/calls"
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
      <Field label="Αναζήτηση">
        <Input
          name="q"
          defaultValue={filters.q}
          placeholder="Αριθμός, γραμμή, agent ή επαφή"
        />
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Κατάσταση">
          <select name="status" defaultValue={filters.status} className={controlClass}>
            <option value="">Όλες</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Κατεύθυνση">
          <select name="direction" defaultValue={filters.direction} className={controlClass}>
            <option value="">Όλες</option>
            {directions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Από">
          <Input type="date" name="from" defaultValue={filters.from} />
        </Field>
        <Field label="Έως">
          <Input type="date" name="to" defaultValue={filters.to} />
        </Field>
      </div>

      {hasFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.q && <Chip href={callsHref({ ...filters, q: "" })}>Αναζήτηση: {filters.q}</Chip>}
          {statusLabel && (
            <Chip href={callsHref({ ...filters, status: "" })}>{statusLabel}</Chip>
          )}
          {directionLabel && (
            <Chip href={callsHref({ ...filters, direction: "" })}>{directionLabel}</Chip>
          )}
          {filters.from && (
            <Chip href={callsHref({ ...filters, from: "" })}>Από {labelDate(filters.from)}</Chip>
          )}
          {filters.to && (
            <Chip href={callsHref({ ...filters, to: "" })}>Έως {labelDate(filters.to)}</Chip>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {hasFilters && (
          <Button asChild variant="outline">
            <Link href="/calls">Καθαρισμός</Link>
          </Button>
        )}
        <Button type="submit">Εφαρμογή</Button>
      </div>
    </form>
  );
}
