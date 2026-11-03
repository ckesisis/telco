import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CallPopup } from "@/components/calls/call-popup";
import { requireAuthContext } from "@/lib/tenancy";
import { canAccessAppPath } from "@/config/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname && !canAccessAppPath(ctx.role, pathname)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        organizationName={ctx.organizationName}
        userName={ctx.userName}
        role={ctx.role}
        isAdmin={ctx.isAdmin}
        isSuperAdmin={ctx.isSuperAdmin}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      <CallPopup />
    </div>
  );
}
