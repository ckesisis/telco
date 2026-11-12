export type EditableApplication = {
  id: string;
  productLine: string;
  applicationType: string | null;
  portingNumber: string | null;
  previousProvider: string | null;
  offerId: string | null;
  agreedMonthlyAmount: string | null;
  isGift: boolean;
  msisdn: string | null;
  msisdnSn: string | null;
  registrationCode: string | null;
  applicationNumber: string | null;
  simCard: string | null;
  loopNumber: string | null;
  billingNotificationType: string | null;
  notes: string | null;
  pendingReason: string | null;
  cancellationReason: string | null;
};

export type EditableOffer = { id: string; name: string; productLine: string };

/** Strips a Prisma application down to serializable fields for the edit dialog. */
export function toEditableApplication(app: {
  id: string;
  productLine: string;
  applicationType: string | null;
  portingNumber: string | null;
  previousProvider: string | null;
  offerId: string | null;
  agreedMonthlyAmount: { toString(): string } | null;
  isGift: boolean;
  msisdn: string | null;
  msisdnSn: string | null;
  registrationCode: string | null;
  applicationNumber: string | null;
  simCard: string | null;
  loopNumber: string | null;
  billingNotificationType: string | null;
  notes: string | null;
  pendingReason: string | null;
  cancellationReason: string | null;
}): EditableApplication {
  return {
    id: app.id,
    productLine: app.productLine,
    applicationType: app.applicationType,
    portingNumber: app.portingNumber,
    previousProvider: app.previousProvider,
    offerId: app.offerId,
    agreedMonthlyAmount:
      app.agreedMonthlyAmount == null ? null : app.agreedMonthlyAmount.toString().replace(".", ","),
    isGift: app.isGift,
    msisdn: app.msisdn,
    msisdnSn: app.msisdnSn,
    registrationCode: app.registrationCode,
    applicationNumber: app.applicationNumber,
    simCard: app.simCard,
    loopNumber: app.loopNumber,
    billingNotificationType: app.billingNotificationType,
    notes: app.notes,
    pendingReason: app.pendingReason,
    cancellationReason: app.cancellationReason,
  };
}

/** Active offers plus any inactive offer already attached to the given applications. */
export function editableOffers(
  active: EditableOffer[],
  attached: ({ id: string; name: string; productLine: string } | null | undefined)[]
): EditableOffer[] {
  const byId = new Map(active.map((offer) => [offer.id, offer]));
  for (const offer of attached) {
    if (offer && !byId.has(offer.id)) {
      byId.set(offer.id, { id: offer.id, name: offer.name, productLine: offer.productLine });
    }
  }
  return [...byId.values()];
}
