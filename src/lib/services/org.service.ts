import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const DEFAULT_STATUSES = [
  { name: "Αναμονή Επιβεβαίωσης", color: "#f59e0b", isDefault: true, isTerminal: false, isSuccess: false },
  { name: "Προς Καταχώρηση", color: "#3b82f6", isDefault: false, isTerminal: false, isSuccess: false },
  { name: "Αναμονή Δικαιολογητικών", color: "#8b5cf6", isDefault: false, isTerminal: false, isSuccess: false },
  { name: "Ενεργοποιημένο", color: "#22c55e", isDefault: false, isTerminal: false, isSuccess: true },
  { name: "Άκυρο", color: "#ef4444", isDefault: false, isTerminal: true, isSuccess: false },
];

const DEFAULT_SOURCES = [
  { name: "Website", channel: "website" as const },
  { name: "Κατάστημα", channel: "store" as const },
  { name: "Facebook", channel: "facebook" as const },
  { name: "Εισαγωγή Αρχείου", channel: "file_import" as const },
];

export async function seedOrganizationCatalog(organizationId: string) {
  await db.appStatus.createMany({
    data: DEFAULT_STATUSES.map((status, index) => ({
      organizationId,
      sortOrder: index,
      ...status,
    })),
  });

  await db.source.createMany({
    data: DEFAULT_SOURCES.map((source) => ({
      organizationId,
      ...source,
    })),
  });
}

export async function getDefaultAppStatusId(organizationId: string) {
  const status = await db.appStatus.findFirst({
    where: { organizationId, isDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!status) {
    throw new Error("No default app status configured");
  }
  return status.id;
}

export async function generateOrderRef(organizationId: string) {
  const year = new Date().getFullYear().toString().slice(-2);
  const count = await db.order.count({ where: { organizationId } });
  return `ORD-${year}${String(count + 1).padStart(5, "0")}`;
}

export function buildOfferSnapshot(offer: {
  code: string;
  name: string;
  productLine: string;
  catalogMonthlyAmount: Prisma.Decimal | null;
  agreedMonthlyAmount?: string | null;
}) {
  return {
    offerCode: offer.code,
    offerName: offer.name,
    productLine: offer.productLine,
    catalogMonthlyAmount: offer.catalogMonthlyAmount
      ? Number(offer.catalogMonthlyAmount)
      : null,
    agreedMonthlyAmount: offer.agreedMonthlyAmount
      ? Number(offer.agreedMonthlyAmount)
      : null,
    capturedAt: new Date().toISOString(),
  };
}
