import type { CourierCarrier } from "@/generated/prisma/client";

export const COURIER_CARRIER_LABELS: Record<CourierCarrier, string> = {
  speedex: "SPEEDEX",
  acs: "ACS Courier",
};

export const COURIER_CARRIERS = Object.keys(COURIER_CARRIER_LABELS) as CourierCarrier[];

export function readCourierCarrier(value: unknown): CourierCarrier {
  if (typeof value === "string" && (COURIER_CARRIERS as string[]).includes(value)) {
    return value as CourierCarrier;
  }
  throw new Error("Επιλέξτε courier");
}
