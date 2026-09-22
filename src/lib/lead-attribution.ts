export type LeadAttribution = {
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readLeadAttribution(input: Record<string, unknown>): LeadAttribution {
  return {
    campaignName: clean(input.campaignName ?? input.campaign_name),
    adsetName: clean(input.adsetName ?? input.adset_name),
    adName: clean(input.adName ?? input.ad_name),
    utmSource: clean(input.utmSource ?? input.utm_source),
    utmMedium: clean(input.utmMedium ?? input.utm_medium),
    utmCampaign: clean(input.utmCampaign ?? input.utm_campaign),
    utmContent: clean(input.utmContent ?? input.utm_content),
    utmTerm: clean(input.utmTerm ?? input.utm_term),
  };
}

export const EMPTY_ATTRIBUTION: LeadAttribution = {
  campaignName: null,
  adsetName: null,
  adName: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
};
