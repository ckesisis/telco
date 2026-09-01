import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("el-GR").format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatHomeAddress(customer: {
  homeStreet?: string | null;
  homeNumber?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeRegion?: string | null;
}) {
  if (!customer.homeStreet && !customer.homeCity) return "—";
  const line1 = [customer.homeStreet, customer.homeNumber].filter(Boolean).join(" ");
  const line2 = [customer.homePostalCode, customer.homeCity, customer.homeRegion]
    .filter(Boolean)
    .join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}
