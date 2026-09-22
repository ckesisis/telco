import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { canAccessLead, getLead } from "@/lib/services/lead.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS } from "@/config/lead-statuses";
import { isMetaChannel } from "@/config/source-channels";
import { formatDateTime } from "@/lib/utils";
import { LeadActions } from "./lead-actions";
import { LeadCallForm } from "./lead-call-form";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const lead = await getLead(ctx.organizationId, id);
  if (!lead || !canAccessLead(ctx, lead)) notFound();

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
              <span className="text-slate-500">Ανάθεση</span>
              <span>{lead.assignedUser?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Επανάκληση</span>
              <span>{formatDateTime(lead.callbackAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Δημιουργήθηκε</span>
              <span>{formatDateTime(lead.createdAt)}</span>
            </div>
            {isMetaChannel(lead.source.channel) && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Campaign</span>
                  <span className="text-right">{lead.campaignName ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Adset</span>
                  <span className="text-right">{lead.adsetName ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Ad</span>
                  <span className="text-right">{lead.adName ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">utm_source</span>
                  <span className="text-right">{lead.utmSource ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">utm_medium</span>
                  <span className="text-right">{lead.utmMedium ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">utm_campaign</span>
                  <span className="text-right">{lead.utmCampaign ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">utm_content</span>
                  <span className="text-right">{lead.utmContent ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">utm_term</span>
                  <span className="text-right">{lead.utmTerm ?? "—"}</span>
                </div>
              </>
            )}
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

      {lead.status !== "converted" && (
        <div className="mt-6 max-w-xl">
          <LeadCallForm
            leadId={lead.id}
            status={lead.status}
            callbackAt={lead.callbackAt?.toISOString() ?? null}
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Σχόλια</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lead.comments.length === 0 ? (
            <p className="text-sm text-slate-500">Δεν υπάρχουν σχόλια</p>
          ) : (
            lead.comments.map((comment) => (
              <div key={comment.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                <p className="font-medium text-slate-900">{comment.user.name}</p>
                <p className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
