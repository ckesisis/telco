import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listLeads } from "@/lib/services/lead.service";
import { getLeadColumnPreferences } from "@/lib/services/user-preference.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { LeadsTable } from "./leads-table";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [leads, columns] = await Promise.all([
    listLeads(ctx.organizationId, ctx, { search: query || undefined }),
    getLeadColumnPreferences(ctx.userId),
  ]);

  return (
    <div>
      <PageHeader
        title="Leads"
        description={
          query
            ? `${leads.length} αποτελέσματα για «${query}»`
            : "Εισερχόμενα leads από όλες τις πηγές"
        }
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/leads/import">Εισαγωγή</Link>
            </Button>
            <Button asChild>
              <Link href="/leads/new">Νέο Lead</Link>
            </Button>
          </div>
        }
      />
      <LeadsTable
        query={query}
        columns={columns}
        leads={leads.map((lead) => ({
          id: lead.id,
          phone: lead.phone,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—",
          email: lead.email || "—",
          source: lead.source.name,
          campaign: lead.campaignName ?? "—",
          statusName: lead.status.name,
          statusColor: lead.status.color,
          agent: lead.assignedUser?.name ?? "—",
          callbackAt: formatDateTime(lead.callbackAt),
          createdAt: formatDateTime(lead.createdAt),
          notes: lead.notes?.trim() || "—",
          adset: lead.adsetName ?? "—",
          ad: lead.adName ?? "—",
        }))}
      />
    </div>
  );
}
