import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Whole-euro draft. A decimal separator is rejected and the digits before it are kept. */
export function wholeAmountDraft(value: string) {
  const decimal = /[.,]/.test(value);
  const digits = (decimal ? value.split(/[.,]/)[0] : value).replace(/\D/g, "").slice(0, 8);
  return {
    value: digits,
    error: decimal ? "Το ποσό δεν δέχεται δεκαδικά" : "",
  };
}

/** Keep a euro amount while typing: up to 2 decimal places, comma or dot. */
export function amountDraft(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const match = cleaned.match(/^(\d{0,8})([.,]\d{0,2})?/);
  return match ? match[0] : "";
}

/** Accepts a blank value or a non-negative euro amount with up to 2 decimals. */
export function readAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim().replace(",", ".")
        : "";
  if (!raw) return null;
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(raw)) {
    throw new Error("Μη έγκυρο ποσό");
  }
  return Number(raw);
}

/** Accepts a blank value or a non-negative whole number of euros. */
export function readWholeAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^\d{1,8}$/.test(raw)) {
    throw new Error("Το ποσό πρέπει να είναι ακέραιος αριθμός");
  }
  return Number(raw);
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
