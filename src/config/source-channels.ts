import type { SourceChannel } from "@/generated/prisma/client";

export const SOURCE_CHANNEL_LABELS: Record<SourceChannel, string> = {
  manual: "Χειροκίνητο",
  facebook: "Facebook",
  meta_ads: "META Ads",
  file_import: "Εισαγωγή Αρχείου",
  website: "Website",
  store: "Κατάστημα",
  other: "Άλλο",
};

export function isMetaChannel(channel: string) {
  return channel === "facebook" || channel === "meta_ads";
}

export const SOURCE_CHANNELS = Object.keys(
  SOURCE_CHANNEL_LABELS
) as SourceChannel[];
