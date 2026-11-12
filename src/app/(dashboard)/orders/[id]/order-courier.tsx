"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/shared/copy-field";
import { COURIER_CARRIER_LABELS, COURIER_CARRIERS } from "@/config/courier-carriers";
import type { CourierCarrier } from "@/generated/prisma/client";

export type ShipmentRow = {
  id: string;
  carrier: CourierCarrier;
  trackingNumber: string;
  comments: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function OrderCourier({
  orderId,
  shipments,
  canManage,
}: {
  orderId: string;
  shipments: ShipmentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [carrier, setCarrier] = useState<CourierCarrier>("speedex");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setAdding(false);
    setCarrier("speedex");
    setTrackingNumber("");
    setComments("");
    setError("");
  }

  async function post(body: object) {
    setBusy(true);
    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Σφάλμα");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAdd() {
    if (!trackingNumber.trim()) {
      setError("Συμπληρώστε αριθμό αποστολής");
      return;
    }
    const ok = await post({ action: "add-shipment", orderId, carrier, trackingNumber, comments });
    if (ok) reset();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Διαγραφή αριθμού αποστολής;")) return;
    await post({ action: "delete-shipment", id });
  }

  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Courier</h2>
        {canManage && !adding && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Προσθήκη
          </Button>
        )}
      </div>

      {shipments.length === 0 && !adding && (
        <p className="text-sm text-slate-500">Δεν υπάρχουν αριθμοί αποστολής.</p>
      )}

      {shipments.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {shipments.map((shipment) => (
            <li key={shipment.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 space-y-0.5">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium text-slate-900">
                    {COURIER_CARRIER_LABELS[shipment.carrier]}
                  </span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <span className="select-all">{shipment.trackingNumber}</span>
                    <CopyButton value={shipment.trackingNumber} label="Αριθμός αποστολής" />
                  </span>
                </p>
                {shipment.comments && (
                  <p className="whitespace-pre-wrap text-slate-700">{shipment.comments}</p>
                )}
                <p className="text-xs text-slate-500">
                  {[shipment.createdBy, shipment.createdAt].filter(Boolean).join(" · ")}
                </p>
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleDelete(shipment.id)}
                  aria-label="Διαγραφή αριθμού αποστολής"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="mt-3 space-y-3 rounded-md border border-slate-200 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Courier</Label>
              <Select value={carrier} onValueChange={(v) => setCarrier(v as CourierCarrier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURIER_CARRIERS.map((value) => (
                    <SelectItem key={value} value={value}>{COURIER_CARRIER_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Αριθμός Αποστολής *</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setError("");
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Σχόλια</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset}>Άκυρο</Button>
            <Button type="button" size="sm" onClick={handleAdd} disabled={busy}>
              {busy ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>
        </div>
      )}
      {!adding && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
