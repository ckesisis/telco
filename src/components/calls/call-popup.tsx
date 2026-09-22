"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PhoneIncoming, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CallParty = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  contactPhone?: string;
  phone?: string;
};

type CallEvent = {
  id: string;
  kind: "incoming" | "outgoing_ended";
  phone: string;
  durationSeconds: number | null;
  customer: CallParty | null;
  lead: CallParty | null;
};

function partyName(party: CallParty | null) {
  if (!party) return null;
  const name = [party.firstName, party.lastName].filter(Boolean).join(" ");
  return name || null;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function CallPopup() {
  const [event, setEvent] = useState<CallEvent | null>(null);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/calls");
      if (!res.ok) return;
      const events = (await res.json()) as CallEvent[];
      setEvent((current) => {
        const next = events[0] ?? null;
        if (current?.id === next?.id) return current;
        return next;
      });
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 2500);
    return () => clearInterval(interval);
  }, [loadPending]);

  async function dismiss() {
    if (!event) return;
    const id = event.id;
    setEvent(null);
    await fetch("/api/v1/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const isIncoming = event?.kind === "incoming";
  const name = partyName(event?.customer ?? null) ?? partyName(event?.lead ?? null);

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncoming ? (
              <PhoneIncoming className="h-5 w-5 text-emerald-600" />
            ) : (
              <PhoneOff className="h-5 w-5 text-slate-600" />
            )}
            {isIncoming ? "Χτυπάει εισερχόμενη κλήση" : "Η εξερχόμενη κλήση ολοκληρώθηκε"}
          </DialogTitle>
          <DialogDescription>
            {name ? `${name} · ${event?.phone}` : event?.phone}
          </DialogDescription>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {isIncoming && (
                <p className="font-medium text-emerald-700">Η κλήση χτυπάει τώρα.</p>
              )}
              <p>
                <span className="text-slate-500">Αριθμός:</span> {event.phone}
              </p>
              {name && (
                <p>
                  <span className="text-slate-500">
                    {event.customer ? "Πελάτης:" : "Lead:"}
                  </span>{" "}
                  {name}
                </p>
              )}
              {!event.customer && !event.lead && (
                <p className="text-slate-500">Άγνωστος αριθμός — δεν βρέθηκε πελάτης</p>
              )}
              {event.kind === "outgoing_ended" && event.durationSeconds != null && (
                <p>
                  <span className="text-slate-500">Διάρκεια:</span>{" "}
                  {formatDuration(event.durationSeconds)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {event.customer && (
                <>
                  <Button asChild variant="outline" onClick={dismiss}>
                    <Link href={`/customers/${event.customer.id}`}>Πελάτης</Link>
                  </Button>
                  <Button asChild onClick={dismiss}>
                    <Link href={`/orders/new?customerId=${event.customer.id}`}>
                      Νέα Παραγγελία
                    </Link>
                  </Button>
                </>
              )}
              {!event.customer && event.lead && (
                <Button asChild onClick={dismiss}>
                  <Link href={`/leads/${event.lead.id}`}>Lead</Link>
                </Button>
              )}
              {!event.customer && !event.lead && (
                <>
                  <Button asChild variant="outline" onClick={dismiss}>
                    <Link href={`/leads/new?phone=${encodeURIComponent(event.phone)}`}>
                      Νέο Lead
                    </Link>
                  </Button>
                  <Button asChild onClick={dismiss}>
                    <Link href={`/customers/new?phone=${encodeURIComponent(event.phone)}`}>
                      Νέος Πελάτης
                    </Link>
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" onClick={dismiss}>
                Κλείσιμο
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
