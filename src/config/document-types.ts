import type { DocumentType } from "@/generated/prisma/client";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  id_card: "Ταυτότητα",
  passport: "Διαβατήριο",
  residence_permit: "Άδεια παραμονής",
  other: "Άλλο",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];
