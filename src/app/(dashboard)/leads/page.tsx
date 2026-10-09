import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listLeadCampaigns, listLeadsPage } from "@/lib/services/lead.service";
import { listLeadStages } from "@/lib/services/lead-status.service";
import { getLeadColumnPreferences } from "@/lib/services/user-preference.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { LeadsTable } from "./leads-table";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string | string[];
    from?: string;
    to?: string;
    campaign?: string;
    page?: string;
  }>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = (Array.isArray(params.status) ? params.status : params.status ? [params.status] : [])
    .map((value) => value.trim())
    .filter(Boolean);
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";
  const campaign = params.campaign?.trim() ?? "";
  const requestedPage = Number(params.page);
  const [result, columns, stages, campaigns] = await Promise.all([
    listLeadsPage(ctx.organizationId, ctx, {
      search: query || undefined,
      status: status.length > 0 ? status : undefined,
      from: from || undefined,
      to: to || undefined,
      campaign: campaign || undefined,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
    getLeadColumnPreferences(ctx.userId),
    listLeadStages(ctx.organizationId),
    listLeadCampaigns(ctx.organizationId, ctx),
  ]);
  const { leads, total, page, pageCount } = result;
  const filtered = Boolean(query || status.length > 0 || from || to || campaign);

  return (
    <div>
      <PageHeader
        title="Leads"
        description={
          filtered
            ? `${total} αποτελέσματα`
            : `${total} εισερχόμενα leads από όλες τις πηγές`
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
        status={status}
        from={from}
        to={to}
        campaign={campaign}
        page={page}
        pageCount={pageCount}
        total={total}
        statuses={stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
        }))}
        campaigns={campaigns}
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
