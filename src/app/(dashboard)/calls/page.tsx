import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listCallHistory, type CallHistoryStatus } from "@/lib/services/call-history";
import { PageHeader, DataTable, EmptyState } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { CallsFilters } from "./calls-filters";
import { callsHref, type CallListFilters } from "./calls-href";

const STATUS_LABELS: Record<CallHistoryStatus, string> = {
  ringing: "Χτυπάει",
  active: "Σε εξέλιξη",
  missed: "Αναπάντητη",
  completed: "Ολοκληρώθηκε",
};

const STATUS_CLASS: Record<CallHistoryStatus, string> = {
  ringing: "bg-emerald-100 text-emerald-800",
  active: "bg-blue-100 text-blue-800",
  missed: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-700",
};

const DIRECTION_LABELS = {
  incoming: "Εισερχόμενη",
  outgoing: "Εξερχόμενη",
} as const;

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) ? page : 1;
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    direction?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const filters: CallListFilters = {
    q: params.q?.trim() ?? "",
    status: params.status?.trim() ?? "",
    direction: params.direction?.trim() ?? "",
    from: params.from?.trim() ?? "",
    to: params.to?.trim() ?? "",
  };
  const { calls, total, page, pageCount } = await listCallHistory(ctx.organizationId, {
    query: filters.q || undefined,
    status: filters.status || undefined,
    direction: filters.direction || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: pageNumber(params.page),
  });
  const filtered = Boolean(filters.q || filters.status || filters.direction || filters.from || filters.to);

  return (
    <div>
      <PageHeader
        title="Κλήσεις"
        description={
          filtered
            ? total === 1
              ? "1 αποτέλεσμα"
              : `${total} αποτελέσματα`
            : `${total} κλήσεις`
        }
      />
      <CallsFilters
        filters={filters}
        statuses={(Object.keys(STATUS_LABELS) as CallHistoryStatus[]).map((value) => ({
          value,
          label: STATUS_LABELS[value],
        }))}
        directions={(Object.keys(DIRECTION_LABELS) as (keyof typeof DIRECTION_LABELS)[]).map(
          (value) => ({ value, label: DIRECTION_LABELS[value] })
        )}
      />
      {total === 0 ? (
        <EmptyState message={filtered ? "Δεν βρέθηκαν κλήσεις" : "Δεν υπάρχουν κλήσεις"} />
      ) : (
        <>
          <DataTable
            headers={["Ώρα", "Κατεύθυνση", "Αριθμός", "Γραμμή", "Κατάσταση", "Διάρκεια", "Επαφή"]}
            rows={calls.map((call) => [
              formatDateTime(call.startedAt),
              DIRECTION_LABELS[call.direction],
              call.phone,
              call.agentName ? `${call.agentName} · ${call.line}` : call.line,
              <Badge key={`${call.id}-status`} className={STATUS_CLASS[call.status]}>
                {STATUS_LABELS[call.status]}
              </Badge>,
              formatDuration(call.durationSeconds),
              call.customerId ? (
                <Link key={`${call.id}-contact`} href={`/customers/${call.customerId}`} className="text-blue-600 hover:underline">
                  {call.contactName ?? "Πελάτης"}
                </Link>
              ) : call.leadId ? (
                <Link key={`${call.id}-contact`} href={`/leads/${call.leadId}`} className="text-blue-600 hover:underline">
                  {call.contactName ?? "Lead"}
                </Link>
              ) : (
                call.contactName ?? "—"
              ),
            ])}
          />
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <p>
                Σελίδα {page} από {pageCount}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={callsHref(filters, page - 1)}>Προηγούμενη</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Προηγούμενη
                  </Button>
                )}
                {page < pageCount ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={callsHref(filters, page + 1)}>Επόμενη</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Επόμενη
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
