"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PREVIOUS_PROVIDERS } from "@/config/application-types";

export type ProspectAnswer = {
  serviceId: string;
  serviceName: string;
  hasContract: boolean | null;
  provider: string;
  expiresMonth: string;
  monthlyAmount: string;
  notes: string;
};

const controlClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

const CHOICES: { value: boolean | null; label: string }[] = [
  { value: true, label: "Ναι" },
  { value: false, label: "Όχι" },
  { value: null, label: "Δεν ξέρω" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function LeadProspectingForm({
  leadId,
  answers,
  notes,
}: {
  leadId: string;
  answers: ProspectAnswer[];
  notes: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(answers);
  const [generalNotes, setGeneralNotes] = useState(notes);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function openDialog() {
    setRows(answers);
    setGeneralNotes(notes);
    setError("");
    setOpen(true);
  }

  function update(serviceId: string, patch: Partial<ProspectAnswer>) {
    setRows((current) =>
      current.map((row) => (row.serviceId === serviceId ? { ...row, ...patch } : row))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prospecting",
        id: leadId,
        entries: rows.map((row) => ({
          serviceId: row.serviceId,
          hasContract: row.hasContract,
          provider: row.provider || null,
          expiresMonth: row.expiresMonth || null,
          monthlyAmount: row.monthlyAmount || null,
          notes: row.notes || null,
        })),
        notes: generalNotes,
      }),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={openDialog}>
        Prospecting
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prospecting</DialogTitle>
            <DialogDescription>
              Τι συμβόλαια έχει ο πελάτης σήμερα και πότε λήγουν.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
              {rows.length === 0 && (
                <p className="text-sm text-slate-500">
                  Δεν υπάρχουν ενεργές υπηρεσίες. Προσθέστε από τις Ρυθμίσεις.
                </p>
              )}
              {rows.map((row) => (
                <div key={row.serviceId} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{row.serviceName}</p>
                    <div className="flex gap-1" role="radiogroup" aria-label="Έχει συμβόλαιο">
                      {CHOICES.map((choice) => {
                        const active = row.hasContract === choice.value;
                        return (
                          <button
                            key={choice.label}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => update(row.serviceId, { hasContract: choice.value })}
                            className={
                              active
                                ? "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                                : "rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                            }
                          >
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {row.hasContract === true && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Πάροχος">
                        <select
                          value={row.provider}
                          onChange={(event) => update(row.serviceId, { provider: event.target.value })}
                          className={controlClass}
                        >
                          <option value="">—</option>
                          {PREVIOUS_PROVIDERS.map((provider) => (
                            <option key={provider} value={provider}>
                              {provider}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Λήξη (μήνας)">
                        <Input
                          type="month"
                          value={row.expiresMonth}
                          onChange={(event) => update(row.serviceId, { expiresMonth: event.target.value })}
                        />
                      </Field>
                      <Field label="Μηνιαίο κόστος (€)">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={row.monthlyAmount}
                          onChange={(event) => update(row.serviceId, { monthlyAmount: event.target.value })}
                        />
                      </Field>
                    </div>
                  )}
                  {row.hasContract !== null && (
                    <div className="mt-3">
                      <Field label="Σημείωση">
                        <Input
                          value={row.notes}
                          onChange={(event) => update(row.serviceId, { notes: event.target.value })}
                          placeholder="π.χ. 100Mbps, 2 γραμμές, δυσαρεστημένος"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="prospecting-notes">Γενικές σημειώσεις</Label>
                <Textarea
                  id="prospecting-notes"
                  value={generalNotes}
                  onChange={(event) => setGeneralNotes(event.target.value)}
                  placeholder="π.χ. ενδιαφέρεται για πακέτο όλης της οικογένειας, ξανακαλέστε μετά τις 18:00"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
