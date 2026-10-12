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

export function readPreviousProvider(value: unknown): PreviousProvider | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Μη έγκυρος προηγούμενος πάροχος");
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  const match = PREVIOUS_PROVIDERS.find((provider) => provider.toUpperCase() === normalized);
  if (!match) throw new Error("Μη έγκυρος προηγούμενος πάροχος");
  return match;
}
