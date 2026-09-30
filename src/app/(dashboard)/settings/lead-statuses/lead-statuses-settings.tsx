"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LeadStatusRow, type LeadStageRow } from "./lead-status-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function LeadStatusesSettings({ stages: initial }: { stages: LeadStageRow[] }) {
  const router = useRouter();
  const [stages, setStages] = useState(initial);
  const [form, setForm] = useState({ name: "", color: "#6b7280", isClosed: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<LeadStageRow | null>(null);
  const [moveToId, setMoveToId] = useState("");
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lead-stage", ...form }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      return;
    }
    const stage = await res.json();
    setStages([...stages, { ...stage, leadCount: 0 }]);
    setForm({ name: "", color: "#6b7280", isClosed: false });
    setError("");
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((stage) => stage.id === active.id);
    const newIndex = stages.findIndex((stage) => stage.id === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex);
    setStages(reordered);
    await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reorder-lead-stages",
        orderedIds: reordered.map((stage) => stage.id),
      }),
    });
  }

  async function saveName(stage: LeadStageRow) {
    const name = draft.trim();
    if (!name || name === stage.name) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/v1/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lead-stage", id: stage.id, name }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      return;
    }
    setStages(stages.map((item) => (item.id === stage.id ? { ...item, name } : item)));
    setEditingId(null);
    setError("");
    router.refresh();
  }

  function askDelete(stage: LeadStageRow) {
    setError("");
    if (stage.leadCount > 0) {
      const fallback = stages.find((item) => item.id !== stage.id);
      setMoveToId(fallback?.id ?? "");
      setDeleting(stage);
      return;
    }
    if (!window.confirm(`Διαγραφή της κατάστασης «${stage.name}»;`)) return;
    void removeStage(stage.id);
  }

  async function removeStage(id: string, targetId?: string) {
    setSaving(true);
    const params = new URLSearchParams({ type: "lead-stage", id });
    if (targetId) params.set("moveToId", targetId);
    const res = await fetch(`/api/v1/catalog?${params}`, { method: "DELETE" });
    setSaving(false);
    if (res.status === 409) {
      const data = await res.json().catch(() => null);
      const stage = stages.find((item) => item.id === id);
      if (!stage) return;
      const fallback = stages.find((item) => item.id !== id);
      setMoveToId(fallback?.id ?? "");
      setDeleting({ ...stage, leadCount: data?.leadCount ?? stage.leadCount });
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      return;
    }
    const moved = targetId ? (deleting?.leadCount ?? 0) : 0;
    setStages(
      stages
        .filter((item) => item.id !== id)
        .map((item) =>
          item.id === targetId ? { ...item, leadCount: item.leadCount + moved } : item
        )
    );
    setDeleting(null);
    setError("");
    router.refresh();
  }

  const destinations = stages.filter((stage) => stage.id !== deleting?.id);

  return (
    <div>
      <PageHeader
        title="Καταστάσεις Leads"
        description="Ονόματα που επιλέγονται μετά από κλήση. Σύρετε για αναδιάταξη."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1">
              <Label>Όνομα</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Χρώμα</Label>
              <Input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="h-10 w-16"
              />
            </div>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isClosed}
                onChange={(event) => setForm({ ...form, isClosed: event.target.checked })}
              />
              Κλείνει το lead
            </label>
            <Button type="submit">Προσθήκη</Button>
          </form>
        </CardContent>
      </Card>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map((stage) => stage.id)} strategy={verticalListSortingStrategy}>
          <div className="max-w-xl space-y-2">
            {stages.map((stage) => (
              <LeadStatusRow
                key={stage.id}
                stage={stage}
                editing={editingId === stage.id}
                draft={draft}
                onDraft={setDraft}
                onStartEdit={() => {
                  setDraft(stage.name);
                  setEditingId(stage.id);
                  setError("");
                }}
                onSave={() => void saveName(stage)}
                onCancel={() => setEditingId(null)}
                onDelete={() => askDelete(stage)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && !saving && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Διαγραφή κατάστασης</DialogTitle>
            <DialogDescription>
              {deleting
                ? `${deleting.leadCount} leads έχουν την κατάσταση «${deleting.name}». Επιλέξτε πού θα μεταφερθούν πριν τη διαγραφή.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Νέα κατάσταση</Label>
              <Select value={moveToId} onValueChange={setMoveToId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleting(null)} disabled={saving}>
                Άκυρο
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving || !moveToId || !deleting}
                onClick={() => deleting && void removeStage(deleting.id, moveToId)}
              >
                {saving ? "Μεταφορά..." : "Μεταφορά και διαγραφή"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
