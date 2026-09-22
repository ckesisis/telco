import { PageHeader } from "@/components/shared/page-header";
import { requireSuperAdmin } from "@/lib/tenancy";
import { listOrganizations } from "@/lib/services/platform.service";
import { OrganizationsAdmin } from "./organizations-admin";

export default async function AdminPage() {
  const session = await requireSuperAdmin();
  const organizations = await listOrganizations();

  return (
    <div>
      <PageHeader
        title="Οργανισμοί"
        description="Δημιουργία και διαχείριση όλων των οργανισμών"
      />
      <OrganizationsAdmin
        activeOrganizationId={session.session.activeOrganizationId ?? null}
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          createdAtLabel: organization.createdAt.toLocaleDateString("el-GR"),
          members: organization._count.members,
          customers: organization._count.customers,
          leads: organization._count.leads,
          orders: organization._count.orders,
        }))}
      />
    </div>
  );
}
