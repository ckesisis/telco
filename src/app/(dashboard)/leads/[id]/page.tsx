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
import { getMemberProfiles } from "@/lib/services/catalog.service";
import { LeadActions } from "./lead-actions";
import { LeadAssignee } from "../lead-assignee";
import { LeadCallForm } from "./lead-call-form";
import { LeadProspectingForm, type ProspectAnswer } from "./lead-prospecting-form";
import { listProspectServices } from "@/lib/services/prospecting.service";
import { formatMonth, toMonthValue } from "@/lib/prospecting";

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
  const [lead, stages, prospectServices, members] = await Promise.all([
    getLead(ctx.organizationId, id),
    listLeadStages(ctx.organizationId),
    listProspectServices(ctx.organizationId),
    ctx.isAdmin ? getMemberProfiles(ctx.organizationId) : Promise.resolve([]),
  ]);
  if (!lead || !canAccessLead(ctx, lead)) notFound();

  const agents = members
    .filter((member) => member.role === "member" && !member.profile?.blocked)
    .map((member) => ({ userId: member.userId, name: member.user.name }));
  if (
    lead.assignedUser &&
    !agents.some((agent) => agent.userId === lead.assignedUserId)
  ) {
    agents.unshift({
      userId: lead.assignedUser.id,
      name: lead.assignedUser.name,
    });
  }

  const calls = await listCallHistoryForPhone(ctx.organizationId, lead.phone);
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Χωρίς όνομα";
  const showAttribution = isMetaChannel(lead.source.channel);

  // Enabled services, plus disabled ones that already have an answer on this lead.
  const prospects = prospectServices
    .map((service) => ({
      service,
      contract: lead.prospectContracts.find((item) => item.serviceId === service.id),
    }))
    .filter(({ service, contract }) => service.enabled || contract);
  const prospectAnswers: ProspectAnswer[] = prospects.map(({ service, contract }) => ({
    serviceId: service.id,
    serviceName: service.name,
    hasContract: contract?.hasContract ?? null,
    provider: contract?.provider ?? "",
    expiresMonth: toMonthValue(contract?.expiresAt),
    monthlyAmount: contract?.monthlyAmount?.toString() ?? "",
    notes: contract?.notes ?? "",
  }));
  const prospectingForm = (
    <LeadProspectingForm
      leadId={lead.id}
      answers={prospectAnswers}
      notes={lead.prospectingNotes ?? ""}
    />
  );

  return (
    <div>
      <PageHeader
        title={name}
        description={lead.source.name}
        action={
          lead.status.isConverted ? (
            prospectingForm
          ) : (
            <div className="flex gap-2">
              <LeadCallForm
                leadId={lead.id}
                statusId={lead.statusId}
                callbackAt={lead.callbackAt?.toISOString() ?? null}
                stages={stages.filter((stage) => !stage.isConverted)}
              />
              {prospectingForm}
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
          <Fact
            label="Agent"
            value={
              ctx.isAdmin ? (
                <LeadAssignee
                  leadId={lead.id}
                  assignedUserId={lead.assignedUserId}
                  agents={agents}
                />
              ) : (
                (lead.assignedUser?.name ?? "—")
              )
            }
          />
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
            <Fact label="Προηγούμενος Πάροχος" value={lead.previousProvider ?? "—"} />
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prospecting</CardTitle>
          </CardHeader>
          <CardContent>
            {prospects.length === 0 && !lead.prospectingNotes ? (
              <p className="text-sm text-slate-500">Δεν υπάρχουν υπηρεσίες prospecting</p>
            ) : (
              <>
              <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {prospects.map(({ service, contract }) => (
                  <Fact
                    key={service.id}
                    label={service.name}
                    value={
                      !contract ? (
                        <span className="text-slate-400">—</span>
                      ) : !contract.hasContract ? (
                        <>
                          <span>Χωρίς συμβόλαιο</span>
                          {contract.notes && (
                            <p className="mt-0.5 text-xs font-normal text-slate-500">{contract.notes}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <span>
                            {[
                              contract.provider ?? "Άγνωστος πάροχος",
                              contract.expiresAt && `λήγει ${formatMonth(contract.expiresAt)}`,
                              contract.monthlyAmount && `${contract.monthlyAmount.toFixed(2)}€`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {contract.notes && (
                            <p className="mt-0.5 text-xs font-normal text-slate-500">{contract.notes}</p>
                          )}
                        </>
                      )
                    }
                  />
                ))}
              </div>
              {lead.prospectingNotes && (
                <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                  <p className="text-xs text-slate-500">Γενικές σημειώσεις</p>
                  <p className="mt-1 whitespace-pre-wrap">{lead.prospectingNotes}</p>
                </div>
              )}
              </>
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
