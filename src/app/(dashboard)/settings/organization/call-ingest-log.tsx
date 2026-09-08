import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

const KIND_LABELS = {
  incoming: "Εισερχόμενη",
  outgoing_ended: "Εξερχόμενη (λήξη)",
} as const;

function formatPayload(payload: Prisma.JsonValue | null) {
  if (payload === null) return "—";
  return JSON.stringify(payload, null, 2);
}

export function CallIngestLog({
  events,
}: {
  events: {
    id: string;
    kind: "incoming" | "outgoing_ended";
    phone: string;
    payload: Prisma.JsonValue | null;
    durationSeconds: number | null;
    externalCallId: string | null;
    createdAt: Date;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call ingest (payloads)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Δεν έχουν έρθει κλήσεις ακόμα.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{KIND_LABELS[event.kind]}</span>
                <span>{event.phone}</span>
                <span className="text-slate-500">{formatDateTime(event.createdAt)}</span>
                {event.durationSeconds != null && (
                  <span className="text-slate-500">{event.durationSeconds}s</span>
                )}
              </div>
              <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">
                {formatPayload(event.payload)}
              </pre>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
