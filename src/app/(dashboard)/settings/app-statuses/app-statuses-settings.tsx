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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  isTerminal: boolean;
  isSuccess: boolean;
};

function SortableStatus({
  status,
  onSaved,
}: {
  status: Status;
  onSaved: (status: Status) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: status.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(status.name);
  const [color, setColor] = useState(status.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit() {
    setName(status.name);
    setColor(status.color);
    setError("");
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/v1/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "app-status", id: status.id, name, color }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Η αποθήκευση απέτυχε");
      return;
    }
    onSaved(await res.json());
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-3">
        <button type="button" {...attributes} {...listeners} className="cursor-grab text-slate-400">
          <GripVertical className="h-4 w-4" />
        </button>
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-1 items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Όνομα κατάστασης"
              autoFocus
              required
            />
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Χρώμα"
              className="h-10 w-16 shrink-0"
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Άκυρο
            </Button>
          </form>
        ) : (
          <>
            <Badge style={{ backgroundColor: status.color, color: "#fff" }}>{status.name}</Badge>
            {status.isDefault && <span className="text-xs text-slate-500">Προεπιλογή</span>}
            {status.isSuccess && <span className="text-xs text-green-600">Επιτυχία</span>}
            {status.isTerminal && <span className="text-xs text-red-600">Τερματική</span>}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="ml-auto"
              aria-label={`Μετονομασία ${status.name}`}
              onClick={startEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function AppStatusesSettings({ statuses: initial }: { statuses: Status[] }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initial);
  const [form, setForm] = useState({ name: "", color: "#6b7280" });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "app-status", ...form }),
    });
    if (res.ok) {
      const status = await res.json();
      setStatuses([...statuses, status]);
      setForm({ name: "", color: "#6b7280" });
      router.refresh();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = statuses.findIndex((s) => s.id === active.id);
    const newIndex = statuses.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(statuses, oldIndex, newIndex);
    setStatuses(reordered);
    await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reorder-statuses", orderedIds: reordered.map((s) => s.id) }),
    });
  }

  return (
    <div>
      <PageHeader title="Καταστάσεις Αιτήσεων" description="Σύρετε για αναδιάταξη" />
      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Όνομα</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Χρώμα</Label>
              <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-16" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Προσθήκη</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {statuses.map((status) => (
              <SortableStatus
                key={status.id}
                status={status}
                onSaved={(saved) => {
                  setStatuses((prev) =>
                    prev.map((s) => (s.id === saved.id ? { ...s, name: saved.name, color: saved.color } : s))
                  );
                  router.refresh();
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
