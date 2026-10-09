"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeadAssignee({
  leadId,
  assignedUserId,
  agents,
}: {
  leadId: string;
  assignedUserId: string | null;
  agents: { userId: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(assignedUserId ?? "");
  const [seen, setSeen] = useState(assignedUserId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (seen !== assignedUserId) {
    setSeen(assignedUserId);
    setValue(assignedUserId ?? "");
  }

  const options =
    value && !agents.some((agent) => agent.userId === value)
      ? [{ userId: value, name: "Τρέχων agent" }, ...agents]
      : agents;

  async function onChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    setError("");

    const response = await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, assignedUserId: next }),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setValue(previous);
      setError(data?.error ?? "Σφάλμα");
      return;
    }
    router.refresh();
  }

  if (!value && options.length === 0) return <span>—</span>;

  return (
    <div className="min-w-36">
      <Select value={value || undefined} onValueChange={onChange} disabled={saving || options.length === 0}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Επιλογή agent" />
        </SelectTrigger>
        <SelectContent>
          {options.map((agent) => (
            <SelectItem key={agent.userId} value={agent.userId}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
