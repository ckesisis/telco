import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listLeads } from "@/lib/services/lead.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS } from "@/config/lead-statuses";
import { formatDateTime } from "@/lib/utils";

export default async function LeadsPage() {
  const ctx = await requireAuthContext();
  const leads = await listLeads(ctx.organizationId, ctx);

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Εισερχόμενα leads από όλες τις πηγές"
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
      <DataTable
        headers={["Τηλέφωνο", "Όνομα", "Πηγή", "Campaign", "Κατάσταση", "Ημ/νία", ""]}
        rows={leads.map((lead) => [
          lead.phone,
          [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—",
          lead.source.name,
          lead.campaignName ?? "—",
          <Badge key={lead.id}>{LEAD_STATUS_LABELS[lead.status]}</Badge>,
          formatDateTime(lead.createdAt),
          <Link key={`link-${lead.id}`} href={`/leads/${lead.id}`} className="text-sm text-blue-600 hover:underline">
            Προβολή
          </Link>,
        ])}
      />
    </div>
  );
}
