import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listCallQueue } from "@/lib/services/lead-call.service";
import { PageHeader, DataTable, EmptyState } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS } from "@/config/lead-statuses";
import { formatDateTime } from "@/lib/utils";

export default async function CallListPage() {
  const ctx = await requireAuthContext();
  const { due, scheduled } = await listCallQueue(ctx.organizationId, ctx);

  function rows(
    leads: Awaited<ReturnType<typeof listCallQueue>>["due"]
  ) {
    return leads.map((lead) => [
      <a key={`tel-${lead.id}`} href={`tel:${lead.phone}`} className="font-medium text-blue-600 hover:underline">
        {lead.phone}
      </a>,
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—",
      lead.source.name,
      lead.campaignName ?? "—",
      <Badge key={lead.id}>{LEAD_STATUS_LABELS[lead.status]}</Badge>,
      formatDateTime(lead.callbackAt),
      ...(ctx.isAdmin ? [lead.assignedUser?.name ?? "—"] : []),
      <Link key={`open-${lead.id}`} href={`/leads/${lead.id}`} className="text-sm text-blue-600 hover:underline">
        Κλήση
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
    <div className="space-y-8">
      <PageHeader
        title="Προς κλήση"
        description="Leads που πρέπει να καλέσετε τώρα"
      />
      {due.length === 0 ? (
        <EmptyState message="Δεν υπάρχουν leads προς κλήση" />
      ) : (
        <DataTable headers={headers} rows={rows(due)} />
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Προγραμματισμένες επανακλήσεις
        </h2>
        {scheduled.length === 0 ? (
          <EmptyState message="Δεν υπάρχουν προγραμματισμένες επανακλήσεις" />
        ) : (
          <DataTable headers={headers} rows={rows(scheduled)} />
        )}
      </div>
    </div>
  );
}
