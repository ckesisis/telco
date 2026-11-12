import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { ApiContext } from "@/lib/api/handler";
import {
  buildOfferSnapshot,
  generateOrderRef,
  getDefaultAppStatusId,
} from "@/lib/services/org.service";
import { canAgentSeeRecord } from "@/lib/services/catalog.service";
import { getConvertedLeadStageId } from "@/lib/services/lead-status.service";
import {
  lineHasApplicationNumber,
  lineHasSimCard,
  lineSupportsPortability,
  PRODUCT_LINE_LABELS,
  PRODUCT_LINES,
} from "@/config/product-lines";
import { readPreviousProvider } from "@/config/application-types";
import {
  canEditBackOfficeFields,
  canEditOrder,
  canManageShipments,
  seesAllRecords,
} from "@/config/roles";
import { readCourierCarrier } from "@/config/courier-carriers";
import { readPortingNumber } from "@/lib/phone";
import { readAmount } from "@/lib/utils";

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

type AddressInput = {
  street: string;
  number?: string | null;
  city: string;
  postalCode: string;
  region?: string | null;
  floor?: string | null;
  notes?: string | null;
};

type DeliveryInput = {
  contractDelivery?: "courier" | "esign";
  esignChannel?: "email" | "sms" | null;
  esignEmail?: string | null;
  esignPhone?: string | null;
  shippingAddress?: AddressInput | null;
};

function readDelivery(data: DeliveryInput) {
  const contractDelivery = data.contractDelivery === "esign" ? "esign" : "courier";
  const esignChannel =
    contractDelivery === "esign" ? (data.esignChannel === "sms" ? "sms" : "email") : null;
  const esignEmail = esignChannel === "email" ? data.esignEmail?.trim() || null : null;
  const esignPhone = esignChannel === "sms" ? data.esignPhone?.trim() || null : null;
  if (esignChannel === "email") {
    if (!esignEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(esignEmail)) {
      throw new Error("Απαιτείται έγκυρο email για αποστολή eSign");
    }
  } else if (esignChannel === "sms") {
    if (!esignPhone || !/^\+?\d{10,15}$/.test(esignPhone.replace(/[\s-]/g, ""))) {
      throw new Error("Απαιτείται έγκυρο κινητό για αποστολή eSign");
    }
  } else if (
    !data.shippingAddress?.street?.trim() ||
    !data.shippingAddress.city?.trim() ||
    !data.shippingAddress.postalCode?.trim()
  ) {
    throw new Error("Απαιτείται διεύθυνση αποστολής για courier");
  }
  const shippingAddress =
    contractDelivery === "courier" && data.shippingAddress
      ? {
          street: data.shippingAddress.street.trim(),
          number: data.shippingAddress.number?.trim() || null,
          city: data.shippingAddress.city.trim(),
          postalCode: data.shippingAddress.postalCode.trim(),
          region: data.shippingAddress.region?.trim() || null,
          floor: data.shippingAddress.floor?.trim() || null,
          notes: data.shippingAddress.notes?.trim() || null,
        }
      : null;
  return { contractDelivery, esignChannel, esignEmail, esignPhone, shippingAddress } as const;
}

/** Validates line/type/porting/amount and clears porting fields on new numbers. */
function readApplicationLine<T extends ApplicationInput>(app: T) {
  const agreedMonthlyAmount = readAmount(app.agreedMonthlyAmount);
  if (app.applicationType === "portability" && !lineSupportsPortability(app.productLine)) {
    throw new Error("Η φορητότητα δεν υποστηρίζεται σε αυτή τη γραμμή");
  }
  if (app.applicationType !== "portability") {
    return { ...app, agreedMonthlyAmount, portingNumber: null, previousProvider: null };
  }
  const portingNumber = readPortingNumber(app.portingNumber);
  if (!portingNumber) {
    throw new Error("Συμπληρώστε τον αριθμό που θα γίνει φορητότητα");
  }
  const previousProvider = readPreviousProvider(app.previousProvider);
  if (!previousProvider) throw new Error("Επιλέξτε προηγούμενο πάροχο");
  return { ...app, agreedMonthlyAmount, portingNumber, previousProvider };
}

export async function listOrders(organizationId: string, ctx: ApiContext) {
  const orders = await db.order.findMany({
    where: {
      organizationId,
      archived: false,
      ...(seesAllRecords(ctx.role)
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
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" } },
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
      customer: { include: { source: true } },
      source: true,
      seller: true,
      shippingAddress: true,
      lead: { include: { source: true, status: true, assignedUser: true } },
      shipments: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
      applications: {
        include: {
          status: true,
          offer: true,
          installationAddress: true,
          logs: { include: { user: true }, orderBy: { createdAt: "desc" } },
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
    contractDelivery?: "courier" | "esign";
    esignChannel?: "email" | "sms" | null;
    esignEmail?: string | null;
    esignPhone?: string | null;
    shippingAddress?: AddressInput | null;
    applications: ApplicationInput[];
  }
) {
  const { contractDelivery, esignChannel, esignEmail, esignPhone, shippingAddress: address } =
    readDelivery(data);
  const applications = data.applications.map(readApplicationLine);

  const defaultStatusId = await getDefaultAppStatusId(organizationId);
  const orderRef = await generateOrderRef(organizationId);

  return db.$transaction(async (tx) => {
    const shippingAddress = address
      ? await tx.shippingAddress.create({ data: address })
      : null;

    const order = await tx.order.create({
      data: {
        organizationId,
        orderRef,
        customerId: data.customerId,
        shippingAddressId: shippingAddress?.id ?? null,
        contractDelivery,
        esignChannel,
        esignEmail,
        esignPhone,
        sourceId: data.sourceId,
        sellerId: ctx.userId,
        salesCode: ctx.salesCode,
        notes: data.notes,
        leadId: data.leadId,
      },
    });

    for (const app of applications) {
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
  const access = seesAllRecords(ctx.role)
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
            { registrationCode: { contains: search, mode: "insensitive" as const } },
            { applicationNumber: { contains: search, mode: "insensitive" as const } },
            { simCard: { contains: search, mode: "insensitive" as const } },
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

function optionalText(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error("Μη έγκυρη τιμή");
  return value.trim() || null;
}

async function findEditableOrder(organizationId: string, ctx: ApiContext, id: string) {
  const order = await db.order.findFirst({ where: { id, organizationId } });
  if (!order) throw new Error("Η παραγγελία δεν βρέθηκε");
  if (!canEditOrder(ctx, order)) throw new Error("Δεν έχετε δικαίωμα επεξεργασίας");
  return order;
}

export async function updateOrder(
  organizationId: string,
  ctx: ApiContext,
  id: string,
  data: DeliveryInput & { sourceId?: string | null; notes?: string | null }
) {
  const order = await findEditableOrder(organizationId, ctx, id);
  const delivery = readDelivery(data);
  const sourceId = data.sourceId || null;
  if (sourceId) {
    const source = await db.source.findFirst({ where: { id: sourceId, organizationId } });
    if (!source) throw new Error("Μη έγκυρη πηγή");
  }

  return db.$transaction(async (tx) => {
    let shippingAddressId = order.shippingAddressId;
    if (delivery.shippingAddress) {
      if (shippingAddressId) {
        await tx.shippingAddress.update({
          where: { id: shippingAddressId },
          data: delivery.shippingAddress,
        });
      } else {
        shippingAddressId = (await tx.shippingAddress.create({ data: delivery.shippingAddress })).id;
      }
    } else {
      shippingAddressId = null;
    }

    const updated = await tx.order.update({
      where: { id },
      data: {
        sourceId,
        notes: optionalText(data.notes),
        contractDelivery: delivery.contractDelivery,
        esignChannel: delivery.esignChannel,
        esignEmail: delivery.esignEmail,
        esignPhone: delivery.esignPhone,
        shippingAddressId,
      },
    });

    // Switching to eSign drops the courier address the order no longer uses.
    if (order.shippingAddressId && !shippingAddressId) {
      await tx.shippingAddress.delete({ where: { id: order.shippingAddressId } });
    }
    return updated;
  });
}

type ApplicationUpdateInput = ApplicationInput & {
  msisdn?: string | null;
  msisdnSn?: string | null;
  registrationCode?: string | null;
  applicationNumber?: string | null;
  simCard?: string | null;
  pendingReason?: string | null;
  cancellationReason?: string | null;
};

const APPLICATION_FIELD_LABELS: Record<string, string> = {
  productLine: "Γραμμή",
  applicationType: "Τύπος",
  portingNumber: "Αρ. Φορητότητας",
  previousProvider: "Πάροχος",
  offerId: "Προσφορά",
  agreedMonthlyAmount: "Ποσό",
  isGift: "Δώρο",
  msisdn: "MSISDN",
  msisdnSn: "MSISDN SN",
  registrationCode: "Κωδικός Καταχώρησης",
  applicationNumber: "Αρ. Αίτησης",
  simCard: "Κάρτα SIM",
  loopNumber: "Αρ. Βρόχου",
  billingNotificationType: "Ειδοπ. Λογαριασμού",
  notes: "Σχόλια",
  pendingReason: "Λόγος Εκκρεμότητας",
  cancellationReason: "Λόγος Ακύρωσης",
};

/**
 * Back office sets the provider-side fields; everyone else keeps the stored
 * values. A field the product line does not use is always cleared.
 */
function backOfficeFields(
  ctx: ApiContext,
  current: { registrationCode: string | null; applicationNumber: string | null; simCard: string | null },
  data: ApplicationUpdateInput
) {
  const source = canEditBackOfficeFields(ctx.role)
    ? {
        registrationCode: optionalText(data.registrationCode),
        applicationNumber: optionalText(data.applicationNumber),
        simCard: optionalText(data.simCard),
      }
    : current;
  return {
    registrationCode: source.registrationCode,
    applicationNumber: lineHasApplicationNumber(data.productLine) ? source.applicationNumber : null,
    simCard: lineHasSimCard(data.productLine) ? source.simCard : null,
  };
}

export async function updateApplicationDetails(
  organizationId: string,
  ctx: ApiContext,
  id: string,
  data: ApplicationUpdateInput
) {
  const app = await db.application.findFirst({
    where: { id, organizationId },
    include: { order: true },
  });
  if (!app) throw new Error("Η αίτηση δεν βρέθηκε");
  if (!canEditOrder(ctx, app.order)) throw new Error("Δεν έχετε δικαίωμα επεξεργασίας");
  if (!(PRODUCT_LINES as string[]).includes(data.productLine)) {
    throw new Error("Μη έγκυρη γραμμή προϊόντος");
  }

  const line = readApplicationLine({
    ...data,
    applicationType: lineSupportsPortability(data.productLine)
      ? data.applicationType === "portability"
        ? "portability"
        : "new_number"
      : null,
  });
  const billingNotificationType =
    data.billingNotificationType === "email" || data.billingNotificationType === "sms"
      ? data.billingNotificationType
      : null;

  const offerId = data.offerId || null;
  const offer = offerId
    ? await db.offer.findFirst({ where: { id: offerId, organizationId } })
    : null;
  if (offerId && !offer) throw new Error("Μη έγκυρη προσφορά");
  if (offer && offer.productLine !== data.productLine) {
    throw new Error("Η προσφορά δεν αντιστοιχεί στη γραμμή προϊόντος");
  }

  const next = {
    productLine: data.productLine as never,
    applicationType: line.applicationType as never,
    portingNumber: line.portingNumber,
    previousProvider: line.previousProvider,
    offerId,
    agreedMonthlyAmount: line.agreedMonthlyAmount,
    isGift: Boolean(data.isGift),
    msisdn: optionalText(data.msisdn),
    msisdnSn: optionalText(data.msisdnSn),
    ...backOfficeFields(ctx, app, data),
    loopNumber: optionalText(data.loopNumber),
    billingNotificationType: billingNotificationType as never,
    notes: optionalText(data.notes),
    pendingReason: optionalText(data.pendingReason),
    cancellationReason: optionalText(data.cancellationReason),
  };

  const previous: Record<string, unknown> = {
    ...app,
    agreedMonthlyAmount: app.agreedMonthlyAmount == null ? null : Number(app.agreedMonthlyAmount),
  };
  const changed = Object.keys(next).filter(
    (key) => (previous[key] ?? null) !== (next[key as keyof typeof next] ?? null)
  );
  if (changed.length === 0) return app;

  const offerChanged = changed.includes("offerId") || changed.includes("agreedMonthlyAmount");
  const offerSnapshot = !offerChanged
    ? undefined
    : offer
      ? buildOfferSnapshot({
          ...offer,
          agreedMonthlyAmount: line.agreedMonthlyAmount ? String(line.agreedMonthlyAmount) : null,
        })
      : Prisma.DbNull;

  return db.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id },
      data: { ...next, ...(offerSnapshot !== undefined && { offerSnapshot }) },
    });
    await tx.log.create({
      data: {
        organizationId,
        applicationId: id,
        userId: ctx.userId,
        action: "updated",
        message: `Επεξεργασία: ${changed.map((key) => APPLICATION_FIELD_LABELS[key] ?? key).join(", ")}`,
        metadata: {
          changes: Object.fromEntries(
            changed.map((key) => [key, { from: previous[key] ?? null, to: next[key as keyof typeof next] ?? null }])
          ),
        },
      },
    });
    return updated;
  });
}

export async function addOrderShipment(
  organizationId: string,
  ctx: ApiContext,
  orderId: string,
  data: { carrier?: unknown; trackingNumber?: unknown; comments?: unknown }
) {
  if (!canManageShipments(ctx.role)) throw new Error("Δεν έχετε δικαίωμα");
  const order = await db.order.findFirst({ where: { id: orderId, organizationId } });
  if (!order) throw new Error("Η παραγγελία δεν βρέθηκε");
  const carrier = readCourierCarrier(data.carrier);
  const trackingNumber = optionalText(data.trackingNumber);
  if (!trackingNumber) throw new Error("Συμπληρώστε αριθμό αποστολής");

  return db.orderShipment.create({
    data: {
      organizationId,
      orderId,
      carrier,
      trackingNumber,
      comments: optionalText(data.comments),
      createdById: ctx.userId === "api-key" ? null : ctx.userId,
    },
  });
}

export async function deleteOrderShipment(organizationId: string, ctx: ApiContext, id: string) {
  if (!canManageShipments(ctx.role)) throw new Error("Δεν έχετε δικαίωμα");
  const { count } = await db.orderShipment.deleteMany({ where: { id, organizationId } });
  if (count === 0) throw new Error("Η αποστολή δεν βρέθηκε");
}
