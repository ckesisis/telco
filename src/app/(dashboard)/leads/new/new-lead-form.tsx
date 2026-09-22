"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isMetaChannel } from "@/config/source-channels";

type Source = { id: string; name: string; channel: string };

export default function NewLeadPage({
  sources,
  initialPhone = "",
}: {
  sources: Source[];
  initialPhone?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    phone: initialPhone,
    firstName: "",
    lastName: "",
    email: "",
    notes: "",
    sourceId: sources[0]?.id ?? "",
    campaignName: "",
    adsetName: "",
    adName: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  });

  const selectedSource = sources.find((source) => source.id === form.sourceId);
  const showAttribution = selectedSource
    ? isMetaChannel(selectedSource.channel)
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Σφάλμα");
      setLoading(false);
      return;
    }

    const lead = await res.json();
    router.push(`/leads/${lead.id}`);
  }

  return (
    <div>
      <PageHeader title="Νέο Lead" description="Καταχώρηση νέου lead" />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Τηλέφωνο *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Όνομα</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Επώνυμο</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Πηγή *</Label>
              <Select
                value={form.sourceId}
                onValueChange={(v) => setForm({ ...form, sourceId: v })}
              >
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
            {showAttribution && (
              <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Facebook / META Ads
                </p>
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    value={form.campaignName}
                    onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adset Name</Label>
                  <Input
                    value={form.adsetName}
                    onChange={(e) => setForm({ ...form, adsetName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ad Name</Label>
                  <Input
                    value={form.adName}
                    onChange={(e) => setForm({ ...form, adName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(
                    [
                      ["utmSource", "utm_source"],
                      ["utmMedium", "utm_medium"],
                      ["utmCampaign", "utm_campaign"],
                      ["utmContent", "utm_content"],
                      ["utmTerm", "utm_term"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
