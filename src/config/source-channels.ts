import type { SourceChannel } from "@/generated/prisma/client";

export const SOURCE_CHANNEL_LABELS: Record<SourceChannel, string> = {
  manual: "Χειροκίνητο",
  facebook: "Facebook",
  file_import: "Εισαγωγή Αρχείου",
  website: "Website",
  store: "Κατάστημα",
  other: "Άλλο",
};

export const SOURCE_CHANNELS = Object.keys(
  SOURCE_CHANNEL_LABELS
) as SourceChannel[];
