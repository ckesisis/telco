import type { ProductLine } from "@/generated/prisma/client";

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  prepaid_mobile: "Prepaid Κινητό",
  postpaid_mobile: "PostPaid Συμβόλαιο",
  fixed_telephony: "Σταθερή Τηλεφωνία",
};

export const PRODUCT_LINES = Object.keys(
  PRODUCT_LINE_LABELS
) as ProductLine[];

export const PORTABILITY_PRODUCT_LINES = [
  "prepaid_mobile",
  "postpaid_mobile",
  "fixed_telephony",
] as const satisfies readonly ProductLine[];

export function lineSupportsPortability(productLine: string) {
  return (PORTABILITY_PRODUCT_LINES as readonly string[]).includes(productLine);
}

/** Lines whose apps get an "Αρ. Αίτησης" from the provider's system. */
export const APPLICATION_NUMBER_PRODUCT_LINES = [
  "postpaid_mobile",
  "fixed_telephony",
] as const satisfies readonly ProductLine[];

/** Lines whose apps get a "Κάρτα SIM". */
export const SIM_CARD_PRODUCT_LINES = ["prepaid_mobile"] as const satisfies readonly ProductLine[];

export function lineHasApplicationNumber(productLine: string) {
  return (APPLICATION_NUMBER_PRODUCT_LINES as readonly string[]).includes(productLine);
}

export function lineHasSimCard(productLine: string) {
  return (SIM_CARD_PRODUCT_LINES as readonly string[]).includes(productLine);
}
