"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type LeadStageOption = {
  id: string;
  name: string;
  isClosed: boolean;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LeadCallForm({
  leadId,
  statusId,
  callbackAt,
  stages,
}: {
  leadId: string;
  statusId: string;
  callbackAt: string | null;
  stages: LeadStageOption[];
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(
    stages.some((stage) => stage.id === statusId) ? statusId : (stages[0]?.id ?? "")
  );
  const selected = stages.find((stage) => stage.id === nextStatus);
  const [comment, setComment] = useState("");
  const [callback, setCallback] = useState(toLocalInput(callbackAt));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  function openDialog() {
    setNextStatus(stages.some((stage) => stage.id === statusId) ? statusId : (stages[0]?.id ?? ""));
    setCallback(toLocalInput(callbackAt));
    setComment("");
    setError("");
    setOpen(true);
  }

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
          selected?.isClosed || !callback ? null : new Date(callback).toISOString(),
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
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={openDialog}>
        Αποτέλεσμα κλήσης
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Αποτέλεσμα κλήσης</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Κατάσταση</Label>
            <Select
              value={nextStatus}
              onValueChange={setNextStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
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
          {!selected?.isClosed && (
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
          )}
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
