"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  enabled: boolean;
  sourceIds: string[];
  shares: { userId: string; percent: number }[];
  sources: { id: string; name: string }[];
  agents: { userId: string; name: string; salesCode: string | null }[];
};

export function LeadDistributionSettings({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [sourceIds, setSourceIds] = useState(settings.sourceIds);
  const [percents, setPercents] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      settings.agents.map((agent) => [
        agent.userId,
        String(
          settings.shares.find((share) => share.userId === agent.userId)
            ?.percent ?? 0
        ),
      ])
    )
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const total = settings.agents.reduce(
    (sum, agent) => sum + (Number(percents[agent.userId]) || 0),
    0
  );

  function toggleSource(sourceId: string) {
    setSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId]
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/v1/lead-distribution", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        sourceIds,
        shares: settings.agents.map((agent) => ({
          userId: agent.userId,
          percent: Number(percents[agent.userId]) || 0,
        })),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Σφάλμα");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Μοίρασμα leads"
        description="Μοιράστε τα εισερχόμενα leads στους sales agents με ποσοστά"
      />
      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ενεργοποίηση</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Ενεργό μοίρασμα για νέα leads από διαχειριστές και API
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Πηγές</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              Αν δεν επιλέξετε πηγή, μοιράζονται τα leads από όλες τις πηγές.
            </p>
            {settings.sources.map((source) => (
              <label key={source.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={sourceIds.includes(source.id)}
                  onChange={() => toggleSource(source.id)}
                />
                {source.name}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.agents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Δεν υπάρχουν sales agents. Προσθέστε τους από τους{" "}
                <Link href="/settings/users" className="text-blue-600 hover:underline">
                  Χρήστες
                </Link>
                .
              </p>
            ) : (
              settings.agents.map((agent) => (
                <div key={agent.userId} className="grid items-center gap-3 md:grid-cols-[1fr_120px]">
                  <Label htmlFor={`share-${agent.userId}`}>
                    {agent.name}
                    {agent.salesCode ? ` (${agent.salesCode})` : ""}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`share-${agent.userId}`}
                      type="number"
                      min={0}
                      max={100}
                      value={percents[agent.userId] ?? "0"}
                      onChange={(event) =>
                        setPercents({
                          ...percents,
                          [agent.userId]: event.target.value,
                        })
                      }
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
              ))
            )}
            <p className={total === 100 ? "text-sm text-slate-500" : "text-sm text-red-600"}>
              Σύνολο: {total}%
            </p>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </form>
    </div>
  );
}
