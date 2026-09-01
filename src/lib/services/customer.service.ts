import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import { canAgentSeeRecord } from "@/lib/services/catalog.service";

export async function listCustomers(
  organizationId: string,
  ctx: ApiContext,
  search?: string
) {
  const customers = await db.customer.findMany({
    where: {
      organizationId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { contactPhone: { contains: search } },
          { vatNumber: { contains: search } },
          { documentNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      source: true,
      _count: { select: { orders: true, leads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (ctx.isAdmin) return customers;

  const orderCustomerIds = await db.order.findMany({
    where: {
      organizationId,
      OR: [
        { sellerId: ctx.userId },
        { salesCode: ctx.salesCode ?? undefined },
        { sellerId: null },
      ],
    },
    select: { customerId: true },
  });
  const allowedIds = new Set(orderCustomerIds.map((o) => o.customerId));
  return customers.filter((c) => allowedIds.has(c.id));
}

export async function getCustomer(organizationId: string, id: string) {
  return db.customer.findFirst({
    where: { id, organizationId },
    include: {
      source: true,
      orders: {
        include: {
          applications: { include: { status: true, offer: true } },
          source: true,
        },
        orderBy: { createdAt: "desc" },
      },
      leads: {
        include: { source: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createCustomer(
  organizationId: string,
  data: {
    firstName: string;
    lastName: string;
    fatherName?: string | null;
    vatNumber?: string | null;
    documentType?: string;
    documentNumber?: string | null;
    documentIssuer?: string | null;
    contactPhone: string;
    homeStreet?: string | null;
    homeNumber?: string | null;
    homeCity?: string | null;
    homePostalCode?: string | null;
    homeRegion?: string | null;
    birthCountry?: string | null;
    birthDate?: Date | null;
    notes?: string | null;
    consentMarketing?: boolean | null;
    sourceId?: string | null;
  }
) {
  return db.customer.create({
    data: {
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      fatherName: data.fatherName,
      vatNumber: data.vatNumber || null,
      documentType: (data.documentType as never) ?? "id_card",
      documentNumber: data.documentNumber,
      documentIssuer: data.documentIssuer,
      contactPhone: data.contactPhone,
      homeStreet: data.homeStreet || null,
      homeNumber: data.homeNumber || null,
      homeCity: data.homeCity || null,
      homePostalCode: data.homePostalCode || null,
      homeRegion: data.homeRegion || null,
      birthCountry: data.birthCountry,
      birthDate: data.birthDate,
      notes: data.notes,
      consentMarketing: data.consentMarketing,
      sourceId: data.sourceId,
    },
  });
}

export async function updateCustomer(
  organizationId: string,
  id: string,
  data: Record<string, unknown>
) {
  const payload = { ...data };
  if ("vatNumber" in payload && !payload.vatNumber) payload.vatNumber = null;
  if ("sourceId" in payload && !payload.sourceId) payload.sourceId = null;
  if ("fatherName" in payload && !payload.fatherName) payload.fatherName = null;
  if ("documentNumber" in payload && !payload.documentNumber) payload.documentNumber = null;
  if ("documentIssuer" in payload && !payload.documentIssuer) payload.documentIssuer = null;
  if ("notes" in payload && !payload.notes) payload.notes = null;
  if ("homeStreet" in payload && !payload.homeStreet) payload.homeStreet = null;
  if ("homeNumber" in payload && !payload.homeNumber) payload.homeNumber = null;
  if ("homeCity" in payload && !payload.homeCity) payload.homeCity = null;
  if ("homePostalCode" in payload && !payload.homePostalCode) payload.homePostalCode = null;
  if ("homeRegion" in payload && !payload.homeRegion) payload.homeRegion = null;

  return db.customer.update({
    where: { id, organizationId },
    data: payload as never,
  });
}

export async function findCustomerByPhone(
  organizationId: string,
  phone: string
) {
  return db.customer.findUnique({
    where: {
      organizationId_contactPhone: { organizationId, contactPhone: phone },
    },
  });
}
