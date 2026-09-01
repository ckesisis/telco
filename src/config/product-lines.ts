import type { ProductLine } from "@/generated/prisma/client";

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  prepaid_mobile: "Prepaid Κινητό",
  postpaid_mobile: "PostPaid Συμβόλαιο",
  fixed_telephony: "Σταθερή Τηλεφωνία",
};

export const PRODUCT_LINES = Object.keys(
  PRODUCT_LINE_LABELS
) as ProductLine[];
