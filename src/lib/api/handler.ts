import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSettings, isAdminRole } from "@/config/roles";
import { createHash, timingSafeEqual } from "crypto";

export type ApiContext = {
  userId: string;
  organizationId: string;
  role: string;
  salesCode: string | null;
  isAdmin: boolean;
};

async function resolveApiContext(
  request: NextRequest
): Promise<ApiContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });
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

  const [member, profile] = await Promise.all([
    db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: session.user.id,
        },
      },
    }),
    db.userProfile.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrgId,
          userId: session.user.id,
        },
      },
    }),
  ]);

  if (!member) return null;

  return {
    userId: session.user.id,
    organizationId: activeOrgId,
    role: member.role,
    salesCode: profile?.salesCode ?? null,
    isAdmin: isAdminRole(member.role),
  };
}

export function withAuth(
  handler: (
    request: NextRequest,
    ctx: ApiContext,
    routeCtx?: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    routeCtx?: { params: Promise<Record<string, string>> }
  ) => {
    const ctx = await resolveApiContext(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, ctx, routeCtx);
  };
}

export function withAdmin(
  handler: (
    request: NextRequest,
    ctx: ApiContext,
    routeCtx?: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return withAuth(async (request, ctx, routeCtx) => {
    if (!canManageSettings(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, ctx, routeCtx);
  });
}

export async function resolveApiKeyContext(
  request: NextRequest
): Promise<ApiContext | null> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;

  const prefix = apiKey.slice(0, 8);
  const keys = await db.apiKey.findMany({
    where: { keyPrefix: prefix, enabled: true },
    include: { organization: true },
  });

  for (const key of keys) {
    const hash = createHash("sha256").update(apiKey).digest();
    const stored = Buffer.from(key.keyHash, "hex");
    if (
      hash.length === stored.length &&
      timingSafeEqual(hash, stored)
    ) {
      await db.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
      return {
        userId: "api-key",
        organizationId: key.organizationId,
        role: "admin",
        salesCode: null,
        isAdmin: true,
      };
    }
  }
  return null;
}

export function withApiKey(
  handler: (
    request: NextRequest,
    ctx: ApiContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const ctx = await resolveApiKeyContext(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, ctx);
  };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
