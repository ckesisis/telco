"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/config/lead-statuses";
import type { LeadStatus } from "@/generated/prisma/client";

const CALL_STATUSES = LEAD_STATUSES.filter((status) => status !== "converted");

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LeadCallForm({
  leadId,
  status,
  callbackAt,
}: {
  leadId: string;
  status: LeadStatus;
  callbackAt: string | null;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<LeadStatus>(
    status === "converted" ? "contacted" : status
  );
  const [comment, setComment] = useState("");
  const [callback, setCallback] = useState(toLocalInput(callbackAt));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "call",
        id: leadId,
        status: nextStatus,
        comment,
        callbackAt:
          nextStatus === "lost" || !callback
            ? null
            : new Date(callback).toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      setSaving(false);
      return;
    }

    setComment("");
    setSaving(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Αποτέλεσμα κλήσης</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Κατάσταση</Label>
            <Select
              value={nextStatus}
              onValueChange={(value) => setNextStatus(value as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {LEAD_STATUS_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-comment">Σχόλιο</Label>
            <Textarea
              id="lead-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Τι είπε ο πελάτης"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-callback">Επανάκληση</Label>
            <input
              id="lead-callback"
              type="datetime-local"
              value={callback}
              onChange={(event) => setCallback(event.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <p className="text-xs text-slate-500">
              Αφήστε κενό αν δεν χρειάζεται νέα κλήση.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
