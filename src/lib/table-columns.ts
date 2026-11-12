export type ColumnDef = { id: string; label: string; defaultVisible: boolean };
export type ColumnPref = { id: string; visible: boolean };

export const ORDER_COLUMNS = [
  { id: "orderRef", label: "Αναφορά", defaultVisible: true },
  { id: "customer", label: "Πελάτης", defaultVisible: true },
  { id: "phone", label: "Τηλέφωνο", defaultVisible: false },
  { id: "vatNumber", label: "ΑΦΜ", defaultVisible: false },
  { id: "taxOffice", label: "ΔΟΥ", defaultVisible: false },
  { id: "source", label: "Πηγή", defaultVisible: true },
  { id: "seller", label: "Πωλητής", defaultVisible: false },
  { id: "salesCode", label: "Κωδικός Πωλητή", defaultVisible: false },
  { id: "applications", label: "Αιτήσεις", defaultVisible: true },
  { id: "statuses", label: "Καταστάσεις", defaultVisible: false },
  { id: "total", label: "Σύνολο (€)", defaultVisible: false },
  { id: "delivery", label: "Αποστολή Συμβολαίου", defaultVisible: false },
  { id: "city", label: "Πόλη Αποστολής", defaultVisible: false },
  { id: "tracking", label: "Courier", defaultVisible: false },
  { id: "notes", label: "Σημειώσεις", defaultVisible: false },
  { id: "createdAt", label: "Ημ/νία", defaultVisible: true },
] as const satisfies readonly ColumnDef[];

export const APP_COLUMNS = [
  { id: "customer", label: "Πελάτης", defaultVisible: true },
  { id: "phone", label: "Τηλέφωνο", defaultVisible: false },
  { id: "orderRef", label: "Παραγγελία", defaultVisible: false },
  { id: "productLine", label: "Γραμμή", defaultVisible: true },
  { id: "offer", label: "Προσφορά", defaultVisible: true },
  { id: "applicationType", label: "Τύπος", defaultVisible: false },
  { id: "status", label: "Κατάσταση", defaultVisible: true },
  { id: "portingNumber", label: "Αρ. Φορητότητας", defaultVisible: false },
  { id: "previousProvider", label: "Πάροχος", defaultVisible: false },
  { id: "msisdn", label: "MSISDN", defaultVisible: false },
  { id: "msisdnSn", label: "MSISDN SN", defaultVisible: false },
  { id: "registrationCode", label: "Κωδικός Καταχώρησης", defaultVisible: false },
  { id: "applicationNumber", label: "Αρ. Αίτησης", defaultVisible: false },
  { id: "simCard", label: "Κάρτα SIM", defaultVisible: false },
  { id: "amount", label: "Ποσό (€)", defaultVisible: false },
  { id: "isGift", label: "Δώρο", defaultVisible: false },
  { id: "seller", label: "Πωλητής", defaultVisible: false },
  { id: "source", label: "Πηγή", defaultVisible: false },
  { id: "pendingReason", label: "Λόγος Εκκρεμότητας", defaultVisible: false },
  { id: "cancellationReason", label: "Λόγος Ακύρωσης", defaultVisible: false },
  { id: "notes", label: "Σχόλια", defaultVisible: false },
  { id: "createdAt", label: "Ημ/νία", defaultVisible: true },
] as const satisfies readonly ColumnDef[];

export const TABLE_COLUMNS = {
  orders: ORDER_COLUMNS,
  apps: APP_COLUMNS,
} as const;

export type TableKey = keyof typeof TABLE_COLUMNS;

export function isTableKey(value: unknown): value is TableKey {
  return typeof value === "string" && value in TABLE_COLUMNS;
}

export function defaultColumns(defs: readonly ColumnDef[]): ColumnPref[] {
  return defs.map((column) => ({ id: column.id, visible: column.defaultVisible }));
}

/**
 * Keeps the saved order and visibility of known columns, drops unknown ones,
 * appends columns added since the preference was saved, and falls back to
 * the defaults when nothing would be visible.
 */
export function normalizeColumns(defs: readonly ColumnDef[], value: unknown): ColumnPref[] {
  const known = new Set(defs.map((column) => column.id));
  const incoming = Array.isArray(value) ? value : [];
  const result: ColumnPref[] = [];
  const seen = new Set<string>();

  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item ? item.id : null;
    const visible = "visible" in item ? item.visible : true;
    if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, visible: visible !== false });
  }

  for (const column of defs) {
    if (!seen.has(column.id)) result.push({ id: column.id, visible: column.defaultVisible });
  }

  return result.some((column) => column.visible) ? result : defaultColumns(defs);
}
