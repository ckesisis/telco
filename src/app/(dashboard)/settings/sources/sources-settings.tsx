"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_CHANNEL_LABELS, SOURCE_CHANNELS } from "@/config/source-channels";

type Source = { id: string; name: string; channel: string; enabled: boolean };

export function SourcesSettings({ sources: initial }: { sources: Source[] }) {
  const router = useRouter();
  const [sources, setSources] = useState(initial);
  const [form, setForm] = useState({ name: "", channel: "manual" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "source", ...form }),
    });
    if (res.ok) {
      const source = await res.json();
      setSources([...sources, source]);
      setForm({ name: "", channel: "manual" });
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader title="Πηγές" description="Κανάλια προέλευσης leads και παραγγελιών" />
      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1"><Label>Όνομα</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1">
              <Label>Κανάλι</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>{SOURCE_CHANNEL_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Προσθήκη</Button>
          </form>
        </CardContent>
      </Card>
      <DataTable
        headers={["Όνομα", "Κανάλι", "Ενεργή"]}
        rows={sources.map((s) => [
          s.name,
          SOURCE_CHANNEL_LABELS[s.channel as keyof typeof SOURCE_CHANNEL_LABELS],
          s.enabled ? "Ναι" : "Όχι",
        ])}
      />
    </div>
  );
}
