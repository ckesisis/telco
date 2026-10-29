import Link from "next/link";
import { Eye } from "lucide-react";
import { requireAuthContext } from "@/lib/tenancy";
import { listCallQueue } from "@/lib/services/lead-call.service";
import { listLeadCampaigns } from "@/lib/services/lead.service";
import { listLeadStages } from "@/lib/services/lead-status.service";
import { PageHeader, DataTable, EmptyState } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { LeadsFilters, type LeadFilters } from "../leads-filters";

type QueueLead = Awaited<ReturnType<typeof listCallQueue>>["due"]["leads"][number];

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) ? page : 1;
}

function callsHref(
  filters: LeadFilters,
  pages: { due?: number; scheduled?: number; tab?: "callbacks" }
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const id of filters.status) params.append("status", id);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.campaign) params.set("campaign", filters.campaign);
  if (pages.tab === "callbacks") params.set("tab", "callbacks");
  if (pages.due && pages.due > 1) params.set("due", String(pages.due));
  if (pages.scheduled && pages.scheduled > 1) params.set("scheduled", String(pages.scheduled));
  const query = params.toString();
  return query ? `/leads/calls?${query}` : "/leads/calls";
}

function QueueTab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "-mb-px border-b-2 border-slate-900 px-1 pb-2 text-sm font-medium text-slate-900"
          : "-mb-px border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-slate-500 hover:text-slate-800"
      }
    >
      {children}
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
        {count}
      </span>
    </Link>
  );
}

function QueuePager({
  page,
  pageCount,
  previousHref,
  nextHref,
}: {
  page: number;
  pageCount: number;
  previousHref: string;
  nextHref: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
      <p>
        Σελίδα {page} από {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={previousHref}>Προηγούμενη</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Προηγούμενη
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>Επόμενη</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Επόμενη
          </Button>
        )}
      </div>
    </div>
  );
}

export default async function CallListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string | string[];
    from?: string;
    to?: string;
    campaign?: string;
    due?: string;
    scheduled?: string;
    tab?: string;
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
  const filters: LeadFilters = { q: query, status, from, to, campaign };
  const duePage = pageNumber(params.due);
  const scheduledPage = pageNumber(params.scheduled);

  const [result, stages, campaigns] = await Promise.all([
    listCallQueue(ctx.organizationId, ctx, {
      search: query || undefined,
      status: status.length > 0 ? status : undefined,
      from: from || undefined,
      to: to || undefined,
      campaign: campaign || undefined,
      duePage,
      scheduledPage,
    }),
    listLeadStages(ctx.organizationId),
    listLeadCampaigns(ctx.organizationId, ctx),
  ]);
  const { due, scheduled } = result;
  const filtered = Boolean(query || status.length > 0 || from || to || campaign);
  const tab = params.tab === "callbacks" ? "callbacks" : "due";
  const visible = tab === "callbacks" ? scheduled : due;

  function rows(leads: QueueLead[]) {
    return leads.map((lead) => [
      <a key={`tel-${lead.id}`} href={`tel:${lead.phone}`} className="font-medium text-blue-600 hover:underline">
        {lead.phone}
      </a>,
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—",
      lead.source.name,
      lead.campaignName ?? "—",
      <Badge key={lead.id} style={{ backgroundColor: lead.status.color, color: "#fff" }}>
        {lead.status.name}
      </Badge>,
      formatDateTime(lead.callbackAt),
      ...(ctx.isAdmin ? [lead.assignedUser?.name ?? "—"] : []),
      <Link
        key={`open-${lead.id}`}
        href={`/leads/${lead.id}`}
        aria-label="Προβολή lead"
        className="inline-flex rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Eye className="h-4 w-4" />
      </Link>,
    ]);
  }

  const headers = [
    "Τηλέφωνο",
    "Όνομα",
    "Πηγή",
    "Campaign",
    "Κατάσταση",
    "Επανάκληση",
    ...(ctx.isAdmin ? ["Agent"] : []),
    "",
  ];

  return (
    <div>
      <PageHeader
        title="Προς κλήση"
        description={
          filtered
            ? visible.total === 1
              ? "1 αποτέλεσμα"
              : `${visible.total} αποτελέσματα`
            : `${due.total} προς κλήση, ${scheduled.total} callbacks`
        }
      />
      <LeadsFilters
        path="/leads/calls"
        extra={tab === "callbacks" ? { tab: "callbacks" } : undefined}
        filters={filters}
        statuses={stages
          .filter((stage) => stage.isDefault && !stage.isClosed && !stage.isConverted)
          .map((stage) => ({ id: stage.id, name: stage.name, color: stage.color }))}
        campaigns={campaigns}
      />

      <div className="mb-4 flex gap-6 border-b border-slate-200">
        <QueueTab
          href={callsHref(filters, { due: due.page, scheduled: scheduled.page })}
          active={tab === "due"}
          count={due.total}
        >
          Προς κλήση
        </QueueTab>
        <QueueTab
          href={callsHref(filters, { due: due.page, scheduled: scheduled.page, tab: "callbacks" })}
          active={tab === "callbacks"}
          count={scheduled.total}
        >
          Callbacks
        </QueueTab>
      </div>

      {visible.total === 0 ? (
        <EmptyState
          message={
            tab === "callbacks"
              ? filtered
                ? "Δεν βρέθηκαν callbacks"
                : "Δεν υπάρχουν callbacks"
              : filtered
                ? "Δεν βρέθηκαν leads προς κλήση"
                : "Δεν υπάρχουν leads προς κλήση"
          }
        />
      ) : (
        <>
          <DataTable headers={headers} rows={rows(visible.leads)} />
          <QueuePager
            page={visible.page}
            pageCount={visible.pageCount}
            previousHref={callsHref(filters, {
              due: tab === "due" ? due.page - 1 : due.page,
              scheduled: tab === "callbacks" ? scheduled.page - 1 : scheduled.page,
              tab: tab === "callbacks" ? "callbacks" : undefined,
            })}
            nextHref={callsHref(filters, {
              due: tab === "due" ? due.page + 1 : due.page,
              scheduled: tab === "callbacks" ? scheduled.page + 1 : scheduled.page,
              tab: tab === "callbacks" ? "callbacks" : undefined,
            })}
          />
        </>
      )}
    </div>
  );
}
