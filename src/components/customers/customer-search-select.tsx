"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DOCUMENT_TYPE_LABELS } from "@/config/document-types";
import type { DocumentType } from "@/generated/prisma/client";

export type CustomerOption = {
  id: string;
  firstName: string;
  lastName: string;
  contactPhone: string;
  vatNumber?: string | null;
  documentNumber?: string | null;
  documentType?: DocumentType;
  homeStreet?: string | null;
  homeNumber?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeRegion?: string | null;
};

function formatCustomerLabel(customer: CustomerOption) {
  return `${customer.firstName} ${customer.lastName} (${customer.contactPhone})`;
}

function customerMatchesQuery(customer: CustomerOption, query: string) {
  const q = query.toLowerCase();
  return (
    customer.firstName.toLowerCase().includes(q) ||
    customer.lastName.toLowerCase().includes(q) ||
    customer.contactPhone.includes(q) ||
    (customer.vatNumber?.toLowerCase().includes(q) ?? false) ||
    (customer.documentNumber?.toLowerCase().includes(q) ?? false)
  );
}

type CustomerSearchSelectProps = {
  value: string;
  onValueChange: (id: string) => void;
  customers: CustomerOption[];
};

export function CustomerSearchSelect({
  value,
  onValueChange,
  customers,
}: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>(customers);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(customers);
      return;
    }

    if (!query.trim()) {
      setResults(customers);
      return;
    }

    const localMatches = customers.filter((c) => customerMatchesQuery(c, query));
    setResults(localMatches);

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/customers?search=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as CustomerOption[];
        const merged = new Map<string, CustomerOption>();
        for (const customer of [...localMatches, ...data]) {
          merged.set(customer.id, customer);
        }
        setResults(Array.from(merged.values()));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, query, customers]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full flex-1 justify-between font-normal"
        >
          <span className="truncate">
            {selected ? formatCustomerLabel(selected) : "Επιλέξτε πελάτη"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          placeholder="Αναζήτηση: όνομα, τηλέφωνο, ΑΦΜ, έγγραφο..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-60 overflow-y-auto">
          {loading && results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">Αναζήτηση...</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">Δεν βρέθηκαν πελάτες</p>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn(
                  "flex w-full flex-col rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100",
                  value === customer.id && "bg-slate-100"
                )}
                onClick={() => {
                  onValueChange(customer.id);
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {formatCustomerLabel(customer)}
                </span>
                {(customer.vatNumber || customer.documentNumber) && (
                  <span className="ml-6 text-xs text-slate-500">
                    {customer.vatNumber && `ΑΦΜ: ${customer.vatNumber}`}
                    {customer.vatNumber && customer.documentNumber && " · "}
                    {customer.documentNumber &&
                      `${customer.documentType ? DOCUMENT_TYPE_LABELS[customer.documentType] : "Έγγραφο"}: ${customer.documentNumber}`}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
