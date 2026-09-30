export const LEAD_COLUMNS = [
  { id: "phone", label: "Τηλέφωνο", defaultVisible: true },
  { id: "name", label: "Όνομα", defaultVisible: true },
  { id: "source", label: "Πηγή", defaultVisible: true },
  { id: "campaign", label: "Campaign", defaultVisible: true },
  { id: "status", label: "Κατάσταση", defaultVisible: true },
  { id: "createdAt", label: "Ημ/νία", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: false },
  { id: "agent", label: "Agent", defaultVisible: false },
  { id: "callbackAt", label: "Επανάκληση", defaultVisible: false },
  { id: "notes", label: "Σημειώσεις", defaultVisible: false },
  { id: "adset", label: "Ad set", defaultVisible: false },
  { id: "ad", label: "Ad", defaultVisible: false },
] as const;

export type LeadColumnId = (typeof LEAD_COLUMNS)[number]["id"];

export type LeadColumnPref = {
  id: LeadColumnId;
  visible: boolean;
};

const COLUMN_IDS = new Set<string>(LEAD_COLUMNS.map((column) => column.id));

export function defaultLeadColumns(): LeadColumnPref[] {
  return LEAD_COLUMNS.map((column) => ({
    id: column.id,
    visible: column.defaultVisible,
  }));
}

export function normalizeLeadColumns(value: unknown): LeadColumnPref[] {
  const incoming = Array.isArray(value) ? value : [];
  const result: LeadColumnPref[] = [];
  const seen = new Set<string>();

  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item ? item.id : null;
    const visible = "visible" in item ? item.visible : true;
    if (typeof id !== "string" || !COLUMN_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id: id as LeadColumnId, visible: visible !== false });
  }

  for (const column of LEAD_COLUMNS) {
    if (!seen.has(column.id)) {
      result.push({ id: column.id, visible: column.defaultVisible });
    }
  }

  if (!result.some((column) => column.visible)) {
    return defaultLeadColumns();
  }

  return result;
}
