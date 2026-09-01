"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  secret: string | null;
  enabled: boolean;
  lastUsedAt: Date | string | null;
};

export function OrganizationApiKeys({ keys: initial }: { keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function copySecret(key: ApiKeyRow) {
    if (!key.secret) return;
    await navigator.clipboard.writeText(key.secret);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ingest" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Σφάλμα");
      setCreating(false);
      return;
    }
    const key = (await res.json()) as ApiKeyRow;
    setKeys([key, ...keys]);
    setCreating(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>API Keys (Ingest)</CardTitle>
        <Button type="button" size="sm" onClick={handleCreate} disabled={creating}>
          {creating ? "Δημιουργία..." : "Νέο API Key"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {keys.length === 0 ? (
          <p className="text-slate-500">Δεν υπάρχουν API keys.</p>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{key.name}</p>
                <span className="text-slate-500">{key.enabled ? "Ενεργό" : "Ανενεργό"}</span>
              </div>
              {key.secret ? (
                <div className="flex gap-2">
                  <Input readOnly value={key.secret} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copySecret(key)}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              ) : (
                <p className="text-slate-500">
                  Το πλήρες key δεν είναι αποθηκευμένο (Prefix: {key.keyPrefix}...).
                  Πατήστε «Νέο API Key» για ένα νέο που θα φαίνεται εδώ.
                </p>
              )}
              {copiedId === key.id && <p className="text-xs text-emerald-600">Αντιγράφηκε</p>}
              {key.lastUsedAt && (
                <p className="text-xs text-slate-400">
                  Τελευταία χρήση: {formatDateTime(key.lastUsedAt)}
                </p>
              )}
            </div>
          ))
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-slate-400">
          Χρησιμοποιήστε το header <code>X-Api-Key</code> για τα ingest endpoints.
        </p>
        <div className="space-y-1 text-xs text-slate-500">
          <p>POST /api/v1/ingest/leads</p>
          <p>POST /api/v1/ingest/calls/incoming</p>
          <p>POST /api/v1/ingest/calls/ended</p>
        </div>
      </CardContent>
    </Card>
  );
}
