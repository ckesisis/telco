"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Source = { id: string; name: string };

export default function LeadImportForm({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      setRows(json);
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    setLoading(true);
    const mapped = rows.map((row) => ({
      phone: String(row.phone ?? row.Phone ?? row.τηλέφωνο ?? ""),
      firstName: row.firstName ?? row.first_name ?? row.όνομα,
      lastName: row.lastName ?? row.last_name ?? row.επώνυμο,
      email: row.email ?? row.Email,
      notes: row.notes,
      externalId: row.externalId ?? row.id,
    }));

    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", sourceId, rows: mapped }),
    });
    const data = await res.json();
    setResult(
      `Δημιουργήθηκαν: ${data.created}, Παραλείφθηκαν: ${data.skipped}, Σφάλματα: ${data.errors?.length ?? 0}`
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Εισαγωγή Leads"
        description="Ανεβάστε CSV ή XLSX με στήλες phone, firstName, lastName, email"
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Πηγή</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Αρχείο</Label>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
          </div>
          {rows.length > 0 && (
            <p className="text-sm text-slate-500">
              Βρέθηκαν {rows.length} γραμμές
            </p>
          )}
          {result && <p className="text-sm text-green-700">{result}</p>}
          <Button onClick={handleImport} disabled={loading || rows.length === 0}>
            {loading ? "Εισαγωγή..." : "Εισαγωγή"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
