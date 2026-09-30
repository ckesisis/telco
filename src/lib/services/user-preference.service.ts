import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeLeadColumns, type LeadColumnPref } from "@/lib/lead-columns";

function preferencesOf(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function getLeadColumnPreferences(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  return normalizeLeadColumns(preferencesOf(user?.preferences ?? null).leadColumns);
}

export async function saveLeadColumnPreferences(userId: string, columns: LeadColumnPref[]) {
  const normalized = normalizeLeadColumns(columns);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const preferences = preferencesOf(user?.preferences ?? null);

  await db.user.update({
    where: { id: userId },
    data: {
      preferences: {
        ...preferences,
        leadColumns: normalized,
      } as Prisma.InputJsonValue,
    },
  });

  return normalized;
}
