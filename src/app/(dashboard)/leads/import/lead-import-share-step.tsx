"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ImportAgent = { userId: string; name: string; salesCode: string | null };
export type ImportShare = { userId: string; percent: number };
// userId -> percent as typed; a missing key means the agent is not selected.
export type ShareState = Record<string, string>;

export function equalSplit(userIds: string[]): ShareState {
  if (userIds.length === 0) return {};
  const base = Math.floor(100 / userIds.length);
  const remainder = 100 - base * userIds.length;
  return Object.fromEntries(
    userIds.map((userId, index) => [userId, String(base + (index < remainder ? 1 : 0))])
  );
}

export function initialShares(agents: ImportAgent[], defaults: ImportShare[]): ShareState {
  const agentIds = new Set(agents.map((agent) => agent.userId));
  const usable = defaults.filter((share) => agentIds.has(share.userId) && share.percent > 0);
  const total = usable.reduce((sum, share) => sum + share.percent, 0);
  if (usable.length > 0 && total === 100) {
    return Object.fromEntries(usable.map((share) => [share.userId, String(share.percent)]));
  }
  return equalSplit(agents.map((agent) => agent.userId));
}

export function activeShares(state: ShareState): ImportShare[] {
  return Object.entries(state)
    .map(([userId, percent]) => ({ userId, percent: Number(percent) }))
    .filter((share) => share.percent > 0);
}

export function sharesValid(state: ShareState) {
  const active = activeShares(state);
  return (
    active.length > 0 &&
    active.every((share) => Number.isInteger(share.percent) && share.percent <= 100) &&
    active.reduce((sum, share) => sum + share.percent, 0) === 100
  );
}

export function LeadImportShareStep({
  agents,
  defaultShares,
  rowCount,
  value,
  onChange,
}: {
  agents: ImportAgent[];
  defaultShares: ImportShare[];
  rowCount: number;
  value: ShareState;
  onChange: (next: ShareState) => void;
}) {
  const active = activeShares(value);
  const total = active.reduce((sum, share) => sum + share.percent, 0);
  const selectedIds = agents.map((agent) => agent.userId).filter((id) => id in value);
  const hasDefaults = defaultShares.some((share) => share.percent > 0);

  function toggle(userId: string, checked: boolean) {
    const next = { ...value };
    if (checked) next[userId] = "0";
    else delete next[userId];
    onChange(next);
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Μοίρασμα σε πωλητές</Label>
          <p className="text-xs text-slate-500">
            Επιλέξτε σε ποιους sales agents θα μοιραστούν τα leads του αρχείου και με τι ποσοστό.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => onChange(equalSplit(selectedIds))}
          >
            Ισόποσα
          </Button>
          {hasDefaults && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(initialShares(agents, defaultShares))}
            >
              Από ρυθμίσεις
            </Button>
          )}
        </div>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-red-600">
          Δεν υπάρχουν ενεργοί sales agents για να μοιραστούν τα leads.
        </p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => {
            const selected = agent.userId in value;
            const percent = Number(value[agent.userId] ?? 0);
            const estimate =
              selected && total > 0 ? Math.round((rowCount * percent) / 100) : 0;
            return (
              <div
                key={agent.userId}
                className="grid items-center gap-3 sm:grid-cols-[1fr_120px_70px]"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => toggle(agent.userId, event.target.checked)}
                  />
                  {agent.name}
                  {agent.salesCode ? ` (${agent.salesCode})` : ""}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!selected}
                    value={selected ? value[agent.userId] : ""}
                    onChange={(event) =>
                      onChange({ ...value, [agent.userId]: event.target.value })
                    }
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <span className="text-xs text-slate-400">
                  {selected ? `~${estimate} leads` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className={total === 100 ? "text-sm text-slate-500" : "text-sm text-red-600"}>
        Σύνολο: {total}%{total !== 100 ? " — πρέπει να είναι 100%" : ""}
      </p>
    </div>
  );
}
