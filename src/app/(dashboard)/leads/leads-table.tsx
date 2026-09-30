"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Columns3, GripVertical } from "lucide-react";
import { DataTable } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LEAD_COLUMNS,
  normalizeLeadColumns,
  type LeadColumnId,
  type LeadColumnPref,
} from "@/lib/lead-columns";

export type LeadTableRow = {
  id: string;
  phone: string;
  name: string;
  email: string;
  source: string;
  campaign: string;
  statusName: string;
  statusColor: string;
  agent: string;
  callbackAt: string;
  createdAt: string;
  notes: string;
  adset: string;
  ad: string;
};

const LABELS = new Map(LEAD_COLUMNS.map((column) => [column.id, column.label]));

function cell(lead: LeadTableRow, id: LeadColumnId) {
  switch (id) {
    case "phone":
      return lead.phone;
    case "name":
      return lead.name;
    case "email":
      return lead.email;
    case "source":
      return lead.source;
    case "campaign":
      return lead.campaign;
    case "status":
      return (
        <Badge key={lead.id} style={{ backgroundColor: lead.statusColor, color: "#fff" }}>
          {lead.statusName}
        </Badge>
      );
    case "agent":
      return lead.agent;
    case "callbackAt":
      return lead.callbackAt;
    case "createdAt":
      return lead.createdAt;
    case "notes":
      return lead.notes;
    case "adset":
      return lead.adset;
    case "ad":
      return lead.ad;
  }
}

function SortableColumn({
  column,
  onToggle,
}: {
  column: LeadColumnPref;
  onToggle: (id: LeadColumnId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md px-1 py-1">
      <button
        type="button"
        className="cursor-grab text-slate-400"
        aria-label={`Μετακίνηση ${LABELS.get(column.id)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex flex-1 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={column.visible}
          onChange={() => onToggle(column.id)}
        />
        {LABELS.get(column.id)}
      </label>
    </div>
  );
}

export function LeadsTable({
  leads,
  columns: initialColumns,
  query,
}: {
  leads: LeadTableRow[];
  columns: LeadColumnPref[];
  query: string;
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const visible = columns.filter((column) => column.visible);

  async function persist(next: LeadColumnPref[]) {
    const normalized = normalizeLeadColumns(next);
    const previous = columns;
    setColumns(normalized);
    setError("");
    const response = await fetch("/api/v1/me/lead-columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: normalized }),
    });
    if (!response.ok) {
      setColumns(previous);
      setError("Η αποθήκευση απέτυχε");
    }
  }

  function toggle(id: LeadColumnId) {
    const next = columns.map((column) =>
      column.id === id ? { ...column, visible: !column.visible } : column
    );
    if (!next.some((column) => column.visible)) return;
    void persist(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((column) => column.id === active.id);
    const newIndex = columns.findIndex((column) => column.id === over.id);
    void persist(arrayMove(columns, oldIndex, newIndex));
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <form method="get" className="flex min-w-0 flex-1 gap-2">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Αναζήτηση: τηλέφωνο, όνομα, πηγή, κατάσταση"
            className="max-w-md"
          />
          <Button type="submit">Αναζήτηση</Button>
          {query && (
            <Button asChild variant="outline">
              <Link href="/leads">Καθαρισμός</Link>
            </Button>
          )}
        </form>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Στήλες">
              <Columns3 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="mb-2 text-sm font-medium text-slate-900">Στήλες</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={columns.map((column) => column.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {columns.map((column) => (
                    <SortableColumn key={column.id} column={column} onToggle={toggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </PopoverContent>
        </Popover>
      </div>
      <DataTable
        headers={[...visible.map((column) => LABELS.get(column.id) ?? column.id), ""]}
        rows={leads.map((lead) => [
          ...visible.map((column) => cell(lead, column.id)),
          <Link
            key={`link-${lead.id}`}
            href={`/leads/${lead.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Προβολή
          </Link>,
        ])}
      />
    </div>
  );
}
