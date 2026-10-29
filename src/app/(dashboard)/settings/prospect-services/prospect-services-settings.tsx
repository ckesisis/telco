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
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type ServiceRow = { id: string; name: string; enabled: boolean; leadCount: number };

async function errorMessage(res: Response) {
  const data = await res.json().catch(() => null);
  return data?.error ?? "Σφάλμα";
}

function Row({
  service,
  onRename,
  onToggle,
  onDelete,
}: {
  service: ServiceRow;
  onRename: (name: string) => Promise<boolean>;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: service.id,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(service.name);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 rounded-lg border bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-slate-400"
        aria-label={`Μετακίνηση ${service.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {editing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onRename(draft)) setEditing(false);
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} required />
          <Button type="submit" size="sm">
            Αποθήκευση
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Άκυρο
          </Button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={service.enabled ? "text-sm font-medium" : "text-sm font-medium text-slate-400 line-through"}>
              {service.name}
            </p>
            <p className="text-xs text-slate-500">{service.leadCount} leads με απάντηση</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={service.enabled} onChange={onToggle} />
            Ενεργή
          </label>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Μετονομασία"
            onClick={() => {
              setDraft(service.name);
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Διαγραφή"
            disabled={service.leadCount > 0}
            title={service.leadCount > 0 ? "Χρησιμοποιείται — απενεργοποιήστε την" : undefined}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function ProspectServicesSettings({ services: initial }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function patch(id: string, data: Partial<Pick<ServiceRow, "name" | "enabled">>) {
    const res = await fetch("/api/v1/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "prospect-service", id, ...data }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return false;
    }
    setServices((current) => current.map((item) => (item.id === id ? { ...item, ...data } : item)));
    setError("");
    router.refresh();
    return true;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "prospect-service", name }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    const service = await res.json();
    setServices([...services, { id: service.id, name: service.name, enabled: true, leadCount: 0 }]);
    setName("");
    setError("");
    router.refresh();
  }

  async function handleDelete(service: ServiceRow) {
    if (!window.confirm(`Διαγραφή της υπηρεσίας «${service.name}»;`)) return;
    const params = new URLSearchParams({ type: "prospect-service", id: service.id });
    const res = await fetch(`/api/v1/catalog?${params}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setServices(services.filter((item) => item.id !== service.id));
    setError("");
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(
      services,
      services.findIndex((item) => item.id === active.id),
      services.findIndex((item) => item.id === over.id)
    );
    setServices(reordered);
    await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reorder-prospect-services",
        orderedIds: reordered.map((item) => item.id),
      }),
    });
  }

  return (
    <div>
      <PageHeader
        title="Υπηρεσίες prospecting"
        description="Για ποιες υπηρεσίες ρωτάνε οι agents αν ο πελάτης έχει συμβόλαιο. Σύρετε για αναδιάταξη."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor="prospect-service-name">Όνομα</Label>
              <Input
                id="prospect-service-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="π.χ. Ρεύμα"
                required
              />
            </div>
            <Button type="submit">Προσθήκη</Button>
          </form>
        </CardContent>
      </Card>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={services.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="max-w-xl space-y-2">
            {services.map((service) => (
              <Row
                key={service.id}
                service={service}
                onRename={(next) => patch(service.id, { name: next.trim() })}
                onToggle={() => void patch(service.id, { enabled: !service.enabled })}
                onDelete={() => void handleDelete(service)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
