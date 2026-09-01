import type { LeadStatus } from "@/generated/prisma/client";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Νέο",
  contacted: "Επικοινωνήθηκε",
  qualified: "Προκριμένο",
  converted: "Μετατράπηκε",
  lost: "Χαμένο",
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
