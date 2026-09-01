import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSettings, isAdminRole } from "@/config/roles";

export type AuthContext = {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  role: string;
  salesCode: string | null;
  isAdmin: boolean;
};

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const activeOrgId =
    session.session.activeOrganizationId ??
    (
      await db.member.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      })
    )?.organizationId;

  if (!activeOrgId) return null;

  const [member, organization, profile] = await Promise.all([
    db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: session.user.id,
        },
      },
    }),
    db.organization.findUnique({ where: { id: activeOrgId } }),
    db.userProfile.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: session.user.id,
        },
      },
    }),
  ]);

  if (!member || !organization) return null;

  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    organizationId: activeOrgId,
    organizationName: organization.name,
    role: member.role,
    salesCode: profile?.salesCode ?? null,
    isAdmin: isAdminRole(member.role),
  };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireAdminContext(): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!canManageSettings(ctx.role)) redirect("/");
  return ctx;
}

export function agentScopeFilter(ctx: AuthContext) {
  if (ctx.isAdmin) return {};
  return {
    OR: [
      { salesCode: ctx.salesCode ?? undefined },
      { sellerId: ctx.userId },
      { assignedUserId: ctx.userId },
      { salesCode: null },
      { sellerId: null },
      { assignedUserId: null },
    ],
  };
}
