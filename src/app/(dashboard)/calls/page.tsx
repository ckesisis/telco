import Link from "next/link";
import { requireAuthContext } from "@/lib/tenancy";
import { listCallHistory, type CallHistoryStatus } from "@/lib/services/call-history";
import { PageHeader, DataTable, EmptyState } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

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

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const calls = await listCallHistory(ctx.organizationId, { query });

  return (
    <div>
      <PageHeader
        title="Κλήσεις"
        description={
          query
            ? `${calls.length} αποτελέσματα για «${query}»`
            : "Μία εγγραφή ανά κλήση, με την έναρξη και τη λήξη μαζί"
        }
      />
      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Αναζήτηση: αριθμός, γραμμή, agent"
          className="max-w-md"
        />
        <Button type="submit">Αναζήτηση</Button>
        {query && (
          <Button asChild variant="outline">
            <Link href="/calls">Καθαρισμός</Link>
          </Button>
        )}
      </form>
      {calls.length === 0 ? (
        <EmptyState message={query ? "Δεν βρέθηκαν κλήσεις" : "Δεν υπάρχουν κλήσεις"} />
      ) : (
        <DataTable
          headers={["Ώρα", "Κατεύθυνση", "Αριθμός", "Γραμμή", "Κατάσταση", "Διάρκεια", "Επαφή"]}
          rows={calls.map((call) => [
            formatDateTime(call.startedAt),
            call.direction === "incoming" ? "Εισερχόμενη" : "Εξερχόμενη",
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
      )}
    </div>
  );
}
