"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LeadActions({ leadId }: { leadId: string }) {
  const router = useRouter();

  async function convert() {
    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "convert", id: leadId }),
    });
    if (res.ok) router.refresh();
  }

  async function markLost() {
    const res = await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: "lost" }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={convert}>
        Μετατροπή σε Πελάτη
      </Button>
      <Button variant="ghost" onClick={markLost}>
        Χαμένο
      </Button>
    </>
  );
}
