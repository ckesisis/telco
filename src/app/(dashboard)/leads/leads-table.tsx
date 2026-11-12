"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnPicker } from "@/components/shared/column-picker";
import { LeadAssignee } from "./lead-assignee";
import { LeadsFilters, leadsHref, type LeadFilters } from "./leads-filters";
import {
  LEAD_COLUMNS,
  normalizeLeadColumns,
  type LeadColumnId,
  type LeadColumnPref,
} from "@/lib/lead-columns";

export type LeadTableRow = {
  id: string;
  phone: string;
  name: string;
  email: string;
  previousProvider: string;
  contractExpiry: string;
  source: string;
  campaign: string;
  statusName: string;
  statusColor: string;
  agent: string;
  agentId: string | null;
  callbackAt: string;
  createdAt: string;
  notes: string;
  adset: string;
  ad: string;
};

const LABELS = new Map<string, string>(LEAD_COLUMNS.map((column) => [column.id, column.label]));

function cell(
  lead: LeadTableRow,
  id: LeadColumnId,
  agents?: { userId: string; name: string }[]
) {
  switch (id) {
    case "phone":
      return lead.phone;
    case "name":
      return lead.name;
    case "email":
      return lead.email;
    case "previousProvider":
      return lead.previousProvider;
    case "contractExpiry":
      return lead.contractExpiry;
    case "source":
      return lead.source;
    case "campaign":
      return lead.campaign;
    case "status":
      return (
        <Badge key={lead.id} style={{ backgroundColor: lead.statusColor, color: "#fff" }}>
          {lead.statusName}
        </Badge>
      );
    case "agent": {
      if (!agents) return lead.agent;
      const options =
        lead.agentId && !agents.some((agent) => agent.userId === lead.agentId)
          ? [{ userId: lead.agentId, name: lead.agent }, ...agents]
          : agents;
      return (
        <LeadAssignee leadId={lead.id} assignedUserId={lead.agentId} agents={options} />
      );
    }
    case "callbackAt":
      return lead.callbackAt;
    case "createdAt":
      return lead.createdAt;
    case "notes":
      return (
        <span className="block max-w-xs truncate" title={lead.notes}>
          {lead.notes}
        </span>
      );
    case "adset":
      return lead.adset;
    case "ad":
      return lead.ad;
  }
}

export function LeadsTable({
  leads,
  columns: initialColumns,
  filters,
  page,
  pageCount,
  total,
  statuses,
  campaigns,
  prospectServices,
  agents,
}: {
  leads: LeadTableRow[];
  columns: LeadColumnPref[];
  filters: LeadFilters;
  page: number;
  pageCount: number;
  total: number;
  statuses: { id: string; name: string; color: string }[];
  campaigns: string[];
  prospectServices: { id: string; name: string }[];
  agents?: { userId: string; name: string }[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [error, setError] = useState("");
  const visible = columns.filter((column) => column.visible);

  async function persist(next: LeadColumnPref[]) {
    const normalized = normalizeLeadColumns(next);
    const previous = columns;
    setColumns(normalized);
    setError("");
    const response = await fetch("/api/v1/me/lead-columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: normalized }),
    });
    if (!response.ok) {
      setColumns(previous);
      setError("Η αποθήκευση απέτυχε");
    }
  }

  return (
    <div>
      <LeadsFilters
        filters={filters}
        statuses={statuses}
        campaigns={campaigns}
        prospectServices={prospectServices}
        actions={
          <ColumnPicker
            columns={columns}
            labels={LABELS}
            onChange={(next) => void persist(next)}
            error={error}
          />
        }
      />
      <DataTable
        nowrap
        headers={[...visible.map((column) => LABELS.get(column.id) ?? column.id), ""]}
        rows={leads.map((lead) => [
          ...visible.map((column) => cell(lead, column.id, agents)),
          <Link
            key={`link-${lead.id}`}
            href={`/leads/${lead.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Προβολή
          </Link>,
        ])}
      />
      {total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <p>
            Σελίδα {page} από {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={leadsHref(filters, page - 1)}>Προηγούμενη</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Προηγούμενη
              </Button>
            )}
            {page < pageCount ? (
              <Button asChild variant="outline" size="sm">
                <Link href={leadsHref(filters, page + 1)}>Επόμενη</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Επόμενη
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
