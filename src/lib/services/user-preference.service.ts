import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeLeadColumns, type LeadColumnPref } from "@/lib/lead-columns";
import { normalizeColumns, TABLE_COLUMNS, type TableKey } from "@/lib/table-columns";

const TABLE_PREFERENCE_KEYS: Record<TableKey, string> = {
  orders: "orderColumns",
  apps: "appColumns",
};

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

export async function getTableColumnPreferences(userId: string, table: TableKey) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const saved = preferencesOf(user?.preferences ?? null)[TABLE_PREFERENCE_KEYS[table]];
  return normalizeColumns(TABLE_COLUMNS[table], saved);
}

export async function saveTableColumnPreferences(userId: string, table: TableKey, columns: unknown) {
  const normalized = normalizeColumns(TABLE_COLUMNS[table], columns);
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
        [TABLE_PREFERENCE_KEYS[table]]: normalized,
      } as Prisma.InputJsonValue,
    },
  });

  return normalized;
}
