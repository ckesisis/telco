export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0030")) digits = digits.slice(4);
  else if (digits.startsWith("30") && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** Number that will be ported: Greek mobile (69xxxxxxxx) or fixed (2xxxxxxxxx). */
export function readPortingNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const normalized = normalizePhone(trimmed);
  if (!/^(69\d{8}|2\d{9})$/.test(normalized)) {
    throw new Error("Ο αριθμός φορητότητας πρέπει να είναι κινητό (69xxxxxxxx) ή σταθερό (2xxxxxxxxx)");
  }
  return normalized;
}

export function phoneLookupValues(phone: string) {
  const normalized = normalizePhone(phone);
  const last10 = normalized.slice(-10);
  const values = new Set<string>([phone.trim(), normalized]);
  if (last10.length === 10) {
    values.add(last10);
    values.add(`0${last10}`);
    values.add(`30${last10}`);
    values.add(`+30${last10}`);
    values.add(`0030${last10}`);
  }
  return [...values].filter(Boolean);
}
