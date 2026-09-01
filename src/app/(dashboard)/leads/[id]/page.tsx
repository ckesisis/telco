import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { getLead } from "@/lib/services/lead.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS } from "@/config/lead-statuses";
import { formatDateTime } from "@/lib/utils";
import { LeadActions } from "./lead-actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const lead = await getLead(ctx.organizationId, id);
  if (!lead) notFound();

  return (
    <div>
      <PageHeader
        title={`Lead: ${lead.phone}`}
        description={[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
        action={
          lead.status !== "converted" && (
            <div className="flex gap-2">
              <LeadActions leadId={lead.id} />
              <Button asChild>
                <Link href={`/orders/new?leadId=${lead.id}`}>Δημιουργία Παραγγελίας</Link>
              </Button>
            </div>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Στοιχεία</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Κατάσταση</span>
              <Badge>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Πηγή</span>
              <span>{lead.source.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span>{lead.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Δημιουργήθηκε</span>
              <span>{formatDateTime(lead.createdAt)}</span>
            </div>
            {lead.notes && (
              <div>
                <p className="text-slate-500">Σημειώσεις</p>
                <p className="mt-1">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Σύνδεση</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lead.customer ? (
              <Link href={`/customers/${lead.customer.id}`} className="text-blue-600 hover:underline">
                Προβολή πελάτη
              </Link>
            ) : (
              <p className="text-slate-500">Δεν έχει συνδεθεί με πελάτη</p>
            )}
            {lead.order && (
              <Link href={`/orders/${lead.order.id}`} className="block text-blue-600 hover:underline">
                Προβολή παραγγελίας
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
