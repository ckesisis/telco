import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenancy";
import { PlatformHeader } from "./platform-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
  const activeOrganizationId = session.session.activeOrganizationId;
  const activeOrganization = activeOrganizationId
    ? await db.organization.findUnique({
        where: { id: activeOrganizationId },
        select: { name: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformHeader
        userName={session.user.name}
        activeOrganizationName={activeOrganization?.name ?? null}
      />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
