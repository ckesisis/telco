import { requireAdminContext } from "@/lib/tenancy";
import { getMemberProfiles } from "@/lib/services/catalog.service";
import { PageHeader, DataTable } from "@/components/shared/page-header";
import { ORG_ROLE_LABELS } from "@/config/roles";
import { UsersSettings } from "./users-settings";

export default async function UsersSettingsPage() {
  const ctx = await requireAdminContext();
  const members = await getMemberProfiles(ctx.organizationId);

  return (
    <div>
      <PageHeader title="Χρήστες" description="Μέλη οργανισμού" />
      <DataTable
        headers={["Όνομα", "Email", "Ρόλος", "Sales Code", "Τηλέφωνο"]}
        rows={members.map((m) => [
          m.user.name,
          m.user.email,
          ORG_ROLE_LABELS[m.role as keyof typeof ORG_ROLE_LABELS] ?? m.role,
          m.profile?.salesCode ?? "—",
          m.profile?.contactPhone ?? "—",
        ])}
      />
      <div className="mt-6">
        <UsersSettings
          currentUserId={ctx.userId}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            salesCode: m.profile?.salesCode ?? "",
            contactPhone: m.profile?.contactPhone ?? "",
          }))}
        />
      </div>
    </div>
  );
}
