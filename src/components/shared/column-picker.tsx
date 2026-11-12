"use client";

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
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Pref = { id: string; visible: boolean };

function SortableColumn({
  column,
  label,
  onToggle,
}: {
  column: Pref;
  label: string;
  onToggle: (id: string) => void;
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
        aria-label={`Μετακίνηση ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex flex-1 items-center gap-2 text-sm">
        <input type="checkbox" checked={column.visible} onChange={() => onToggle(column.id)} />
        {label}
      </label>
    </div>
  );
}

/** Popover to show/hide columns and drag them into a new order. */
export function ColumnPicker<T extends Pref>({
  columns,
  labels,
  onChange,
  error,
}: {
  columns: T[];
  labels: Map<string, string>;
  onChange: (next: T[]) => void;
  error?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function toggle(id: string) {
    const next = columns.map((column) =>
      column.id === id ? { ...column, visible: !column.visible } : column
    );
    if (!next.some((column) => column.visible)) return;
    onChange(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((column) => column.id === active.id);
    const newIndex = columns.findIndex((column) => column.id === over.id);
    onChange(arrayMove(columns, oldIndex, newIndex));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Στήλες">
          <Columns3 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-64 overflow-y-auto p-3">
        <p className="mb-2 text-sm font-medium text-slate-900">Στήλες</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={columns.map((column) => column.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  label={labels.get(column.id) ?? column.id}
                  onToggle={toggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
