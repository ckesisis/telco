"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CampaignDraft = {
  name: string;
  percents: Record<string, string>;
};

export function CampaignShareFields({
  agents,
  knownCampaigns,
  campaigns,
  onChange,
}: {
  agents: { userId: string; name: string; salesCode: string | null }[];
  knownCampaigns: string[];
  campaigns: CampaignDraft[];
  onChange: (campaigns: CampaignDraft[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addCampaign() {
    const name = draft.trim();
    if (!name) return;
    if (campaigns.some((campaign) => campaign.name === name)) {
      setError("Η καμπάνια υπάρχει ήδη");
      return;
    }
    setError("");
    onChange([
      ...campaigns,
      {
        name,
        percents: Object.fromEntries(agents.map((agent) => [agent.userId, "0"])),
      },
    ]);
    setDraft("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Για Facebook και META Ads, μια καμπάνια με δικά της ποσοστά μοιράζεται
          ξεχωριστά μέσα στην ημέρα. Οι υπόλοιπες καμπάνιες χρησιμοποιούν το
          προεπιλεγμένο μοίρασμα. Το όνομα πρέπει να είναι ακριβώς το ίδιο με το
          campaign name του lead.
        </p>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="campaign-name">Όνομα καμπάνιας</Label>
            <Input
              id="campaign-name"
              list="known-campaigns"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCampaign();
                }
              }}
            />
            <datalist id="known-campaigns">
              {knownCampaigns.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <Button type="button" variant="outline" onClick={addCampaign}>
            Προσθήκη
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {campaigns.map((campaign) => {
          const total = agents.reduce(
            (sum, agent) => sum + (Number(campaign.percents[agent.userId]) || 0),
            0
          );
          return (
            <div key={campaign.name} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange(campaigns.filter((item) => item.name !== campaign.name))
                  }
                >
                  Αφαίρεση
                </Button>
              </div>
              {agents.map((agent) => (
                <div key={agent.userId} className="grid items-center gap-3 md:grid-cols-[1fr_120px]">
                  <Label htmlFor={`campaign-${campaign.name}-${agent.userId}`}>
                    {agent.name}
                    {agent.salesCode ? ` (${agent.salesCode})` : ""}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`campaign-${campaign.name}-${agent.userId}`}
                      type="number"
                      min={0}
                      max={100}
                      value={campaign.percents[agent.userId] ?? "0"}
                      onChange={(event) =>
                        onChange(
                          campaigns.map((item) =>
                            item.name === campaign.name
                              ? {
                                  ...item,
                                  percents: {
                                    ...item.percents,
                                    [agent.userId]: event.target.value,
                                  },
                                }
                              : item
                          )
                        )
                      }
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
              ))}
              <p className={total === 100 ? "text-sm text-slate-500" : "text-sm text-red-600"}>
                Σύνολο: {total}%
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
