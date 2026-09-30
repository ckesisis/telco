import { db } from "@/lib/db";
import type { ApiContext } from "@/lib/api/handler";
import {
  buildOfferSnapshot,
  generateOrderRef,
  getDefaultAppStatusId,
} from "@/lib/services/org.service";
import { canAgentSeeRecord } from "@/lib/services/catalog.service";
import { getConvertedLeadStageId } from "@/lib/services/lead-status.service";
import { PRODUCT_LINE_LABELS, PRODUCT_LINES } from "@/config/product-lines";

type ApplicationInput = {
  productLine: string;
  applicationType?: string | null;
  portingNumber?: string | null;
  previousProvider?: string | null;
  notes?: string | null;
  offerId?: string | null;
  agreedMonthlyAmount?: number | null;
  isGift?: boolean;
  loopNumber?: string | null;
  billingNotificationType?: string | null;
  installationAddress?: {
    street: string;
    number?: string | null;
    city: string;
    postalCode: string;
    region?: string | null;
    floor?: string | null;
    notes?: string | null;
  } | null;
};

export async function listOrders(organizationId: string, ctx: ApiContext) {
  const orders = await db.order.findMany({
    where: {
      organizationId,
      archived: false,
      ...(ctx.isAdmin
        ? {}
        : {
            OR: [
              { sellerId: ctx.userId },
              { salesCode: ctx.salesCode ?? undefined },
              { sellerId: null },
            ],
          }),
    },
    include: {
      customer: true,
      source: true,
      seller: true,
      applications: {
        include: { status: true, offer: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return orders;
}

export async function getOrder(organizationId: string, id: string) {
  return db.order.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      source: true,
      seller: true,
      shippingAddress: true,
      lead: true,
      applications: {
        include: {
          status: true,
          offer: true,
          installationAddress: true,
        },
      },
    },
  });
}

export async function createOrder(
  organizationId: string,
  ctx: ApiContext,
  data: {
    customerId: string;
    sourceId?: string | null;
    notes?: string | null;
    leadId?: string | null;
    shippingAddress: {
      street: string;
      number?: string | null;
      city: string;
      postalCode: string;
      region?: string | null;
      floor?: string | null;
      notes?: string | null;
    };
    applications: ApplicationInput[];
  }
) {
  const defaultStatusId = await getDefaultAppStatusId(organizationId);
  const orderRef = await generateOrderRef(organizationId);

  return db.$transaction(async (tx) => {
    const shippingAddress = await tx.shippingAddress.create({
      data: data.shippingAddress,
    });

    const order = await tx.order.create({
      data: {
        organizationId,
        orderRef,
        customerId: data.customerId,
        shippingAddressId: shippingAddress.id,
        sourceId: data.sourceId,
        sellerId: ctx.userId,
        salesCode: ctx.salesCode,
        notes: data.notes,
        leadId: data.leadId,
      },
    });

    for (const app of data.applications) {
      let offerSnapshot: object | undefined;
      if (app.offerId) {
        const offer = await tx.offer.findFirst({
          where: { id: app.offerId, organizationId },
        });
        if (offer) {
          offerSnapshot = buildOfferSnapshot({
            ...offer,
            agreedMonthlyAmount: app.agreedMonthlyAmount
              ? String(app.agreedMonthlyAmount)
              : null,
          });
        }
      }

      let installationAddressId: string | undefined;
      if (app.installationAddress) {
        const addr = await tx.installationAddress.create({
          data: app.installationAddress,
        });
        installationAddressId = addr.id;
      }

      await tx.application.create({
        data: {
          organizationId,
          orderId: order.id,
          productLine: app.productLine as never,
          applicationType: app.applicationType as never,
          portingNumber: app.portingNumber,
          previousProvider: app.previousProvider,
          notes: app.notes,
          statusId: defaultStatusId,
          offerId: app.offerId,
          offerSnapshot,
          agreedMonthlyAmount: app.agreedMonthlyAmount ?? undefined,
          isGift: app.isGift ?? false,
          loopNumber: app.loopNumber,
          billingNotificationType: app.billingNotificationType as never,
          installationAddressId,
        },
      });
    }

    if (data.leadId) {
      await tx.lead.update({
        where: { id: data.leadId, organizationId },
        data: {
          statusId: await getConvertedLeadStageId(organizationId),
          customerId: data.customerId,
        },
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        applications: { include: { status: true } },
      },
    });
  });
}

export async function listApplications(
  organizationId: string,
  ctx: ApiContext,
  filters?: { statusId?: string; productLine?: string; search?: string }
) {
  const search = filters?.search?.trim();
  const digits = search?.replace(/\D/g, "") ?? "";
  const lines = search
    ? PRODUCT_LINES.filter((line) =>
        PRODUCT_LINE_LABELS[line].toLowerCase().includes(search.toLowerCase())
      )
    : [];
  const access = ctx.isAdmin
    ? []
    : [
        {
          order: {
            OR: [
              { sellerId: ctx.userId },
              { salesCode: ctx.salesCode ?? undefined },
              { sellerId: null },
            ],
          },
        },
      ];
  const match = search
    ? [
        {
          OR: [
            { offer: { name: { contains: search, mode: "insensitive" as const } } },
            { status: { name: { contains: search, mode: "insensitive" as const } } },
            { msisdn: { contains: search } },
            { portingNumber: { contains: search } },
            { order: { customer: { firstName: { contains: search, mode: "insensitive" as const } } } },
            { order: { customer: { lastName: { contains: search, mode: "insensitive" as const } } } },
            { order: { customer: { contactPhone: { contains: search } } } },
            ...(digits.length >= 3 && digits !== search
              ? [
                  { msisdn: { contains: digits } },
                  { portingNumber: { contains: digits } },
                  { order: { customer: { contactPhone: { contains: digits } } } },
                ]
              : []),
            ...(lines.length > 0 ? [{ productLine: { in: lines } }] : []),
          ],
        },
      ]
    : [];

  return db.application.findMany({
    where: {
      organizationId,
      ...(filters?.statusId && { statusId: filters.statusId }),
      ...(filters?.productLine && {
        productLine: filters.productLine as never,
      }),
      ...(access.length + match.length > 0 ? { AND: [...access, ...match] } : {}),
    },
    include: {
      status: true,
      offer: true,
      order: {
        include: { customer: true, source: true, seller: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getApplication(organizationId: string, id: string) {
  return db.application.findFirst({
    where: { id, organizationId },
    include: {
      status: true,
      offer: true,
      installationAddress: true,
      order: {
        include: {
          customer: true,
          source: true,
          seller: true,
          shippingAddress: true,
        },
      },
      logs: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateApplicationStatus(
  organizationId: string,
  ctx: ApiContext,
  id: string,
  statusId: string,
  extra?: { cancellationReason?: string; pendingReason?: string; msisdn?: string }
) {
  const app = await db.application.findFirst({
    where: { id, organizationId },
    include: { order: true },
  });
  if (!app) throw new Error("Application not found");
  if (!canAgentSeeRecord(ctx, app.order)) throw new Error("Forbidden");

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.application.update({
      where: { id },
      data: {
        statusId,
        cancellationReason: extra?.cancellationReason,
        pendingReason: extra?.pendingReason,
        msisdn: extra?.msisdn,
      },
      include: { status: true },
    });

    await tx.log.create({
      data: {
        organizationId,
        applicationId: id,
        userId: ctx.userId,
        action: "status_changed",
        message: `Status changed to ${result.status.name}`,
        metadata: { statusId, from: app.statusId },
      },
    });

    return result;
  });

  return updated;
}

export async function updateApplication(
  organizationId: string,
  id: string,
  data: Record<string, unknown>
) {
  return db.application.update({
    where: { id, organizationId },
    data: data as never,
  });
}
