"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export type CopyFieldDef = {
  label: string;
  value: string | null;
  wide?: boolean;
};

export function CopyButton({
  value,
  label,
  children,
  className,
}: {
  value: string | null | undefined;
  label: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      aria-label={`Αντιγραφή: ${label}`}
      title={copied ? "Αντιγράφηκε" : "Αντιγραφή"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded text-slate-400 transition-colors duration-150 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-30",
        children ? "h-7 px-2 text-xs font-medium text-slate-600" : "h-7 w-7",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", copied && "text-emerald-600")} aria-hidden />
      {children && <span>{copied ? "Αντιγράφηκε" : children}</span>}
    </button>
  );
}

export function CopyField({ label, value, wide }: CopyFieldDef) {
  return (
    <div className={cn("min-w-0", wide && "col-span-full")}>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex min-h-9 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1 pl-3 pr-1">
        <span
          className={cn(
            "min-w-0 flex-1 select-all text-sm text-slate-900",
            wide ? "whitespace-pre-wrap break-words" : "truncate"
          )}
          title={value ?? undefined}
        >
          {value || <span className="select-none text-slate-400">—</span>}
        </span>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

export function CopyFieldGroup({
  title,
  fields,
  action,
}: {
  title: string;
  fields: CopyFieldDef[];
  action?: React.ReactNode;
}) {
  const allText = fields.map((field) => `${field.label}: ${field.value ?? ""}`).join("\n");
  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-1">
          {action}
          <CopyButton value={allText} label={title}>Αντιγραφή όλων</CopyButton>
        </div>
      </div>
      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
        {fields.map((field) => (
          <CopyField key={field.label} {...field} />
        ))}
      </div>
    </section>
  );
}
