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
type ImportField =
  | "phone"
  | "firstName"
  | "lastName"
  | "email"
  | "notes"
  | "externalId"
  | "campaignName"
  | "adsetName"
  | "adName"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmContent"
  | "utmTerm";

const NONE = "__none__";

const FIELDS: { key: ImportField; label: string; required?: boolean; aliases: string[] }[] = [
  { key: "phone", label: "Τηλέφωνο", required: true, aliases: ["phone", "phone_number", "phonenumber", "mobile", "msisdn", "τηλέφωνο", "τηλ"] },
  { key: "firstName", label: "Όνομα", aliases: ["firstname", "first_name", "όνομα"] },
  { key: "lastName", label: "Επώνυμο", aliases: ["lastname", "last_name", "επώνυμο"] },
  { key: "email", label: "Email", aliases: ["email"] },
  { key: "notes", label: "Σημειώσεις", aliases: ["notes", "note"] },
  { key: "externalId", label: "Εξωτερικό ID", aliases: ["externalid", "external_id", "id"] },
  { key: "campaignName", label: "Campaign", aliases: ["campaignname", "campaign_name"] },
  { key: "adsetName", label: "Ad set", aliases: ["adsetname", "adset_name"] },
  { key: "adName", label: "Ad", aliases: ["adname", "ad_name"] },
  { key: "utmSource", label: "UTM source", aliases: ["utmsource", "utm_source"] },
  { key: "utmMedium", label: "UTM medium", aliases: ["utmmedium", "utm_medium"] },
  { key: "utmCampaign", label: "UTM campaign", aliases: ["utmcampaign", "utm_campaign"] },
  { key: "utmContent", label: "UTM content", aliases: ["utmcontent", "utm_content"] },
  { key: "utmTerm", label: "UTM term", aliases: ["utmterm", "utm_term"] },
];

function cleanHeader(key: string) {
  return key.replace(/^\uFEFF/, "").trim();
}

function guessHeader(headers: string[], aliases: string[]) {
  const wanted = new Set(aliases.map((alias) => alias.toLowerCase()));
  return headers.find((header) => wanted.has(header.toLowerCase())) ?? "";
}

function cellValue(row: Record<string, unknown>, header: string) {
  if (!header) return "";
  const value = row[header];
  if (value == null) return "";
  return String(value).trim();
}

export default function LeadImportForm({ sources }: { sources: Source[] }) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
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
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const parsed = json.map((row) => {
        const next: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          next[cleanHeader(key)] = value;
        }
        return next;
      });
      const fileHeaders = [...new Set(parsed.flatMap((row) => Object.keys(row)))];
      setRows(parsed);
      setHeaders(fileHeaders);
      setMapping(
        Object.fromEntries(
          FIELDS.map((field) => [field.key, guessHeader(fileHeaders, field.aliases)])
        )
      );
      setResult("");
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    setLoading(true);
    const mapped = rows.map((row) => {
      const values = Object.fromEntries(
        FIELDS.map((field) => [field.key, cellValue(row, mapping[field.key] ?? "")])
      ) as Record<ImportField, string>;
      return {
        phone: values.phone,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        email: values.email || undefined,
        notes: values.notes || undefined,
        externalId: values.externalId || undefined,
        campaignName: values.campaignName || undefined,
        adsetName: values.adsetName || undefined,
        adName: values.adName || undefined,
        utmSource: values.utmSource || undefined,
        utmMedium: values.utmMedium || undefined,
        utmCampaign: values.utmCampaign || undefined,
        utmContent: values.utmContent || undefined,
        utmTerm: values.utmTerm || undefined,
      };
    });

    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", sourceId, rows: mapped }),
    });
    const data = await res.json();
    const errors = Array.isArray(data.errors) ? data.errors : [];
    const preview = errors.slice(0, 3).join(" · ");
    setResult(
      `Δημιουργήθηκαν: ${data.created ?? 0}, Παραλείφθηκαν: ${data.skipped ?? 0}, Σφάλματα: ${errors.length}${preview ? ` (${preview})` : ""}`
    );
    setLoading(false);
    router.refresh();
  }

  const phoneMapped = Boolean(mapping.phone);

  return (
    <div>
      <PageHeader
        title="Εισαγωγή Leads"
        description="Ανεβάστε το αρχείο και αντιστοιχίστε κάθε στήλη στο πεδίο του lead. Το τηλέφωνο είναι υποχρεωτικό."
      />
      <Card className="max-w-2xl">
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
            <p className="text-sm text-slate-500">Βρέθηκαν {rows.length} γραμμές</p>
          )}
          {headers.length > 0 && (
            <div className="space-y-3">
              <Label>Αντιστοίχιση στηλών</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map((field) => {
                  const sample = cellValue(rows[0] ?? {}, mapping[field.key] ?? "");
                  return (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs text-slate-500">
                        {field.label}
                        {field.required ? " *" : ""}
                      </Label>
                      <Select
                        value={mapping[field.key] || NONE}
                        onValueChange={(value) =>
                          setMapping((current) => ({
                            ...current,
                            [field.key]: value === NONE ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>—</SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sample && (
                        <p className="truncate text-xs text-slate-400">{sample}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {result && <p className="text-sm text-green-700">{result}</p>}
          <Button
            onClick={handleImport}
            disabled={loading || rows.length === 0 || !phoneMapped}
          >
            {loading ? "Εισαγωγή..." : "Εισαγωγή"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
