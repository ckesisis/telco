"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type LeadStageRow = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  isClosed: boolean;
  isConverted: boolean;
  leadCount: number;
};

export function LeadStatusRow({
  stage,
  editing,
  draft,
  onDraft,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  stage: LeadStageRow;
  editing: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: stage.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const locked = stage.isDefault || stage.isConverted;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border bg-white p-3">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-slate-400">
        <GripVertical className="h-4 w-4" />
      </button>
      {editing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <Input value={draft} onChange={(event) => onDraft(event.target.value)} required />
          <Button type="submit" size="sm">
            Αποθήκευση
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Άκυρο
          </Button>
        </form>
      ) : (
        <>
          <Badge style={{ backgroundColor: stage.color, color: "#fff" }}>{stage.name}</Badge>
          {stage.isDefault && <span className="text-xs text-slate-500">Νέα leads</span>}
          {stage.isConverted && <span className="text-xs text-green-600">Μετατροπή</span>}
          {stage.isClosed && !stage.isConverted && (
            <span className="text-xs text-red-600">Κλείνει το lead</span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" aria-label="Μετονομασία" onClick={onStartEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Διαγραφή"
              disabled={locked}
              title={locked ? "Η προεπιλεγμένη κατάσταση και η μετατροπή δεν διαγράφονται" : "Διαγραφή"}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
        </>
      )}
    </div>
  );
}
