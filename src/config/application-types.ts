import type { ApplicationType } from "@/generated/prisma/client";

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  new_number: "NEW",
  portability: "MNP",
};

export const PREPAID_APPLICATION_TYPES = ["new_number", "portability"] as const satisfies readonly ApplicationType[];

export const PREVIOUS_PROVIDERS = [
  "COSMOTE",
  "VODAFONE",
  "NOVA",
  "HORIZON",
  "CYTA",
  "ΔΕΗ",
] as const;

export type PreviousProvider = (typeof PREVIOUS_PROVIDERS)[number];
