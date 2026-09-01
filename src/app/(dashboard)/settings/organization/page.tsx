import { requireAdminContext } from "@/lib/tenancy";
import { db } from "@/lib/db";
import { listApiKeys } from "@/lib/services/api-key.service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationApiKeys } from "./organization-api-keys";

export default async function OrganizationSettingsPage() {
  const ctx = await requireAdminContext();
  const [org, apiKeys] = await Promise.all([
    db.organization.findUnique({
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
    }),
    listApiKeys(ctx.organizationId),
  ]);

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
        <OrganizationApiKeys keys={apiKeys} />
      </div>
    </div>
  );
}
