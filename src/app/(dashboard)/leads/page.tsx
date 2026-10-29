import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { getMemberProfiles } from "@/lib/services/catalog.service";
import { listLeadCampaigns, listLeadsPage } from "@/lib/services/lead.service";
import { listLeadStages } from "@/lib/services/lead-status.service";
import { getLeadColumnPreferences } from "@/lib/services/user-preference.service";
import { listProspectServices } from "@/lib/services/prospecting.service";
import { formatMonth } from "@/lib/prospecting";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { LeadsTable } from "./leads-table";
import type { LeadFilters } from "./leads-filters";

const MONTH = /^\d{4}-\d{2}$/;

function monthParam(value?: string) {
  const trimmed = value?.trim() ?? "";
  return MONTH.test(trimmed) ? trimmed : "";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string | string[];
    from?: string;
    to?: string;
    campaign?: string;
    service?: string;
    contract?: string;
    provider?: string;
    expFrom?: string;
    expTo?: string;
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
  const service = params.service?.trim() ?? "";
  const contract = params.contract === "yes" || params.contract === "no" ? params.contract : "";
  const provider = params.provider?.trim() ?? "";
  const expFrom = monthParam(params.expFrom);
  const expTo = monthParam(params.expTo);
  const filters: LeadFilters = {
    q: query,
    status,
    from,
    to,
    campaign,
    service,
    contract,
    provider,
    expFrom,
    expTo,
  };
  const requestedPage = Number(params.page);
  const [result, columns, stages, campaigns, members, prospectServices] = await Promise.all([
    listLeadsPage(ctx.organizationId, ctx, {
      search: query || undefined,
      status: status.length > 0 ? status : undefined,
      from: from || undefined,
      to: to || undefined,
      campaign: campaign || undefined,
      service: service || undefined,
      contract: contract || undefined,
      provider: provider || undefined,
      expFrom: expFrom || undefined,
      expTo: expTo || undefined,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
    getLeadColumnPreferences(ctx.userId),
    listLeadStages(ctx.organizationId),
    listLeadCampaigns(ctx.organizationId, ctx),
    ctx.isAdmin ? getMemberProfiles(ctx.organizationId) : Promise.resolve([]),
    listProspectServices(ctx.organizationId),
  ]);
  const agents = members
    .filter((member) => member.role === "member" && !member.profile?.blocked)
    .map((member) => ({ userId: member.userId, name: member.user.name }));
  const { leads, total, page, pageCount } = result;
  const filtered = Boolean(
    query || status.length > 0 || from || to || campaign || service || contract || provider || expFrom || expTo
  );

  // Expiry cell: the filtered service's contract, otherwise every known contract, soonest first.
  function contractExpiry(lead: (typeof leads)[number]) {
    const contracts = lead.prospectContracts
      .filter((item) => !service || item.serviceId === service)
      .filter((item) => item.hasContract || contract === "no")
      .sort(
        (a, b) =>
          (a.expiresAt?.getTime() ?? Infinity) - (b.expiresAt?.getTime() ?? Infinity) ||
          a.service.sortOrder - b.service.sortOrder
      );
    if (contracts.length === 0) return "—";
    return contracts
      .map((item) =>
        [
          service ? null : `${item.service.name}:`,
          item.hasContract ? item.provider : "Χωρίς συμβόλαιο",
          item.expiresAt ? formatMonth(item.expiresAt) : null,
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(", ");
  }

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
        filters={filters}
        page={page}
        pageCount={pageCount}
        total={total}
        statuses={stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
        }))}
        campaigns={campaigns}
        prospectServices={prospectServices
          .filter((item) => item.enabled || item.id === service)
          .map((item) => ({ id: item.id, name: item.name }))}
        agents={ctx.isAdmin ? agents : undefined}
        columns={columns}
        leads={leads.map((lead) => ({
          id: lead.id,
          phone: lead.phone,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—",
          email: lead.email || "—",
          previousProvider: lead.previousProvider || "—",
          contractExpiry: contractExpiry(lead),
          source: lead.source.name,
          campaign: lead.campaignName ?? "—",
          statusName: lead.status.name,
          statusColor: lead.status.color,
          agent: lead.assignedUser?.name ?? "—",
          agentId: lead.assignedUserId,
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
