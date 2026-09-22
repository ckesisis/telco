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
  isSuperAdmin: boolean;
};

type AccessInput = {
  userId: string;
  userName: string;
  userEmail: string;
  activeOrganizationId: string | null;
};

export type AccessResult =
  | { kind: "tenant"; ctx: AuthContext }
  | { kind: "platform" }
  | { kind: "none" };

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

export async function resolveAccess(input: AccessInput): Promise<AccessResult> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { isSuperAdmin: true },
  });
  if (!user) return { kind: "none" };

  if (user.isSuperAdmin) {
    if (!input.activeOrganizationId) return { kind: "platform" };
    const organization = await db.organization.findUnique({
      where: { id: input.activeOrganizationId },
    });
    if (!organization) return { kind: "platform" };
    return {
      kind: "tenant",
      ctx: {
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        organizationId: organization.id,
        organizationName: organization.name,
        role: "owner",
        salesCode: null,
        isAdmin: true,
        isSuperAdmin: true,
      },
    };
  }

  const activeOrgId =
    input.activeOrganizationId ??
    (
      await db.member.findFirst({
        where: { userId: input.userId },
        orderBy: { createdAt: "asc" },
      })
    )?.organizationId;

  if (!activeOrgId) return { kind: "none" };

  const [member, organization, profile] = await Promise.all([
    db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: input.userId,
        },
      },
    }),
    db.organization.findUnique({ where: { id: activeOrgId } }),
    db.userProfile.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: input.userId,
        },
      },
    }),
  ]);

  if (!member || !organization) return { kind: "none" };

  return {
    kind: "tenant",
    ctx: {
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      organizationId: activeOrgId,
      organizationName: organization.name,
      role: member.role,
      salesCode: profile?.salesCode ?? null,
      isAdmin: isAdminRole(member.role),
      isSuperAdmin: false,
    },
  };
}

function accessInputFromSession(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
  };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session?.user) return null;
  const access = await resolveAccess(accessInputFromSession(session));
  return access.kind === "tenant" ? access.ctx : null;
}

export async function requireAuthContext(): Promise<AuthContext> {
  const session = await requireSession();
  const access = await resolveAccess(accessInputFromSession(session));
  if (access.kind === "tenant") return access.ctx;
  if (access.kind === "platform") redirect("/admin");
  redirect("/login");
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/");
  return session;
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
