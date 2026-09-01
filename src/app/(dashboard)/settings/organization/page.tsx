import { requireAdminContext } from "@/lib/tenancy";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizationSettingsPage() {
  const ctx = await requireAdminContext();
  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    include: {
      _count: {
        select: {
          members: true,
          customers: true,
          orders: true,
          leads: true,
        },
      },
    },
  });

  const apiKeys = await db.apiKey.findMany({
    where: { organizationId: ctx.organizationId },
    select: { id: true, name: true, keyPrefix: true, enabled: true, lastUsedAt: true },
  });

  return (
    <div>
      <PageHeader title="Οργανισμός" description="Ρυθμίσεις tenant" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Στοιχεία</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">Όνομα:</span> {org?.name}</p>
            <p><span className="text-slate-500">Slug:</span> {org?.slug}</p>
            <p><span className="text-slate-500">Μέλη:</span> {org?._count.members}</p>
            <p><span className="text-slate-500">Πελάτες:</span> {org?._count.customers}</p>
            <p><span className="text-slate-500">Παραγγελίες:</span> {org?._count.orders}</p>
            <p><span className="text-slate-500">Leads:</span> {org?._count.leads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>API Keys (Ingest)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {apiKeys.length === 0 ? (
              <p className="text-slate-500">Δεν υπάρχουν API keys. Τρέξτε το seed script.</p>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="rounded-lg border p-3">
                  <p className="font-medium">{key.name}</p>
                  <p className="text-slate-500">Prefix: {key.keyPrefix}...</p>
                  <p className="text-slate-500">{key.enabled ? "Ενεργό" : "Ανενεργό"}</p>
                </div>
              ))
            )}
            <p className="text-xs text-slate-400">
              Χρησιμοποιήστε το header <code>X-Api-Key</code> για τα ingest endpoints.
            </p>
            <div className="space-y-2 text-xs text-slate-500">
              <p>POST /api/v1/ingest/leads</p>
              <p>POST /api/v1/ingest/calls/incoming</p>
              <p>POST /api/v1/ingest/calls/ended</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
