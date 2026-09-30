import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/tenancy";
import { canAccessLead, getLead } from "@/lib/services/lead.service";
import { listCallHistoryForPhone, type CallHistoryStatus } from "@/lib/services/call-history";
import { PageHeader, DataTable, EmptyState } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMetaChannel } from "@/config/source-channels";
import { listLeadStages } from "@/lib/services/lead-status.service";
import { formatDateTime } from "@/lib/utils";
import { LeadActions } from "./lead-actions";
import { LeadCallForm } from "./lead-call-form";

const CALL_STATUS_LABELS: Record<CallHistoryStatus, string> = {
  ringing: "Χτυπάει",
  active: "Σε εξέλιξη",
  missed: "Αναπάντητη",
  completed: "Ολοκληρώθηκε",
};

const CALL_STATUS_CLASS: Record<CallHistoryStatus, string> = {
  ringing: "bg-emerald-100 text-emerald-800",
  active: "bg-blue-100 text-blue-800",
  missed: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-700",
};

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAuthContext();
  const [lead, stages] = await Promise.all([
    getLead(ctx.organizationId, id),
    listLeadStages(ctx.organizationId),
  ]);
  if (!lead || !canAccessLead(ctx, lead)) notFound();

  const calls = await listCallHistoryForPhone(ctx.organizationId, lead.phone);
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Χωρίς όνομα";
  const showAttribution = isMetaChannel(lead.source.channel);

  return (
    <div>
      <PageHeader
        title={name}
        description={lead.source.name}
        action={
          !lead.status.isConverted && (
            <div className="flex gap-2">
              <LeadCallForm
                leadId={lead.id}
                statusId={lead.statusId}
                callbackAt={lead.callbackAt?.toISOString() ?? null}
                stages={stages.filter((stage) => !stage.isConverted)}
              />
              <LeadActions leadId={lead.id} />
              <Button asChild variant="outline">
                <Link href={`/orders/new?leadId=${lead.id}`}>Δημιουργία Παραγγελίας</Link>
              </Button>
            </div>
          )
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label="Τηλέφωνο"
            value={
              <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                {lead.phone}
              </a>
            }
          />
          <Fact
            label="Κατάσταση"
            value={
              <Badge style={{ backgroundColor: lead.status.color, color: "#fff" }}>
                {lead.status.name}
              </Badge>
            }
          />
          <Fact label="Agent" value={lead.assignedUser?.name ?? "—"} />
          <Fact label="Επανάκληση" value={formatDateTime(lead.callbackAt)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Στοιχεία</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Fact label="Email" value={lead.email ?? "—"} />
            <Fact label="Δημιουργήθηκε" value={formatDateTime(lead.createdAt)} />
            <Fact
              label="Πελάτης"
              value={
                lead.customer ? (
                  <Link href={`/customers/${lead.customer.id}`} className="text-blue-600 hover:underline">
                    Προβολή
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Fact
              label="Παραγγελία"
              value={
                lead.order ? (
                  <Link href={`/orders/${lead.order.id}`} className="text-blue-600 hover:underline">
                    Προβολή
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            {lead.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Σημειώσεις</p>
                <p className="mt-1 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
            {showAttribution && (
              <>
                <Fact label="Campaign" value={lead.campaignName ?? "—"} />
                <Fact label="Ad set" value={lead.adsetName ?? "—"} />
                <Fact label="Ad" value={lead.adName ?? "—"} />
                <Fact label="utm_source" value={lead.utmSource ?? "—"} />
                <Fact label="utm_medium" value={lead.utmMedium ?? "—"} />
                <Fact label="utm_campaign" value={lead.utmCampaign ?? "—"} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
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

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Ιστορικό κλήσεων</h2>
        {calls.length === 0 ? (
          <EmptyState message="Δεν υπάρχουν κλήσεις για αυτό το τηλέφωνο" />
        ) : (
          <DataTable
            headers={["Ώρα", "Κατεύθυνση", "Γραμμή", "Κατάσταση", "Διάρκεια"]}
            rows={calls.map((call) => [
              formatDateTime(call.startedAt),
              call.direction === "incoming" ? "Εισερχόμενη" : "Εξερχόμενη",
              call.agentName ? `${call.agentName} · ${call.line}` : call.line,
              <Badge key={`${call.id}-status`} className={CALL_STATUS_CLASS[call.status]}>
                {CALL_STATUS_LABELS[call.status]}
              </Badge>,
              formatDuration(call.durationSeconds),
            ])}
          />
        )}
      </div>

    </div>
  );
}
