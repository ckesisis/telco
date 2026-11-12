import { defaultColumns, normalizeColumns } from "@/lib/table-columns";

export const LEAD_COLUMNS = [
  { id: "phone", label: "Τηλέφωνο", defaultVisible: true },
  { id: "name", label: "Όνομα", defaultVisible: true },
  { id: "source", label: "Πηγή", defaultVisible: true },
  { id: "campaign", label: "Campaign", defaultVisible: true },
  { id: "status", label: "Κατάσταση", defaultVisible: true },
  { id: "createdAt", label: "Ημ/νία", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: false },
  { id: "previousProvider", label: "Προηγούμενος Πάροχος", defaultVisible: true },
  { id: "contractExpiry", label: "Λήξη συμβολαίου", defaultVisible: true },
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

export function defaultLeadColumns(): LeadColumnPref[] {
  return defaultColumns(LEAD_COLUMNS) as LeadColumnPref[];
}

export function normalizeLeadColumns(value: unknown): LeadColumnPref[] {
  return normalizeColumns(LEAD_COLUMNS, value) as LeadColumnPref[];
}
