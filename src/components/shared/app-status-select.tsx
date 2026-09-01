"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = { id: string; name: string; color: string };

export function AppStatusSelect({
  applicationId,
  currentStatusId,
  statuses,
}: {
  applicationId: string;
  currentStatusId: string;
  statuses: Status[];
}) {
  const router = useRouter();

  async function handleChange(statusId: string) {
    await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-status", id: applicationId, statusId }),
    });
    router.refresh();
  }

  return (
    <Select value={currentStatusId} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
