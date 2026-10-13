import { db } from "@/lib/db";
import { getMemberProfiles } from "@/lib/services/catalog.service";

const DISTRIBUTION_TIME_ZONE = "Europe/Athens";

function timezoneOffsetMs(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    value.hour === "24" ? 0 : Number(value.hour),
    Number(value.minute),
    Number(value.second)
  );
  return asUtc - date.getTime();
}

function zonedDayStart(timeZone: string, year: number, month: number, day: number) {
  const utcMidnight = Date.UTC(year, month - 1, day);
  const offset = timezoneOffsetMs(timeZone, new Date(utcMidnight));
  return new Date(utcMidnight - timezoneOffsetMs(timeZone, new Date(utcMidnight - offset)));
}

function distributionDayRange(now = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISTRIBUTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  return {
    gte: zonedDayStart(DISTRIBUTION_TIME_ZONE, year, month, day),
    lt: zonedDayStart(DISTRIBUTION_TIME_ZONE, year, month, day + 1),
  };
}

function groupCampaignShares(
  rows: { campaignName: string; userId: string; percent: number }[]
) {
  const byName = new Map<string, { userId: string; percent: number }[]>();
  for (const row of rows) {
    const shares = byName.get(row.campaignName) ?? [];
    shares.push({ userId: row.userId, percent: row.percent });
    byName.set(row.campaignName, shares);
  }
  return [...byName.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "el"))
    .map(([campaignName, shares]) => ({ campaignName, shares }));
}

export async function getLeadDistribution(organizationId: string) {
  const [distribution, shares, campaignShares, sources, members, catalogSources, campaigns] =
    await Promise.all([
      db.leadDistribution.findUnique({ where: { organizationId } }),
      db.leadShare.findMany({ where: { organizationId } }),
      db.leadCampaignShare.findMany({
        where: { organizationId },
        orderBy: { campaignName: "asc" },
      }),
      db.leadDistributionSource.findMany({ where: { organizationId } }),
      getMemberProfiles(organizationId),
      db.source.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),
      db.lead.findMany({
        where: { organizationId, campaignName: { not: null } },
        distinct: ["campaignName"],
        select: { campaignName: true },
        orderBy: { campaignName: "asc" },
      }),
    ]);

  return {
    enabled: distribution?.enabled ?? false,
    sourceIds: sources.map((source) => source.sourceId),
    shares: shares.map((share) => ({
      userId: share.userId,
      percent: share.percent,
    })),
    campaigns: groupCampaignShares(campaignShares),
    knownCampaigns: campaigns.flatMap((campaign) =>
      campaign.campaignName ? [campaign.campaignName] : []
    ),
    sources: catalogSources.map((source) => ({
      id: source.id,
      name: source.name,
    })),
    agents: members
      .filter((member) => member.role === "member" && !member.profile?.blocked)
      .map((member) => ({
        userId: member.userId,
        name: member.user.name,
        salesCode: member.profile?.salesCode ?? null,
      })),
  };
}

function validateShares(
  shares: { userId: string; percent: number }[],
  agentIds: Set<string>,
  label: string
) {
  const active = shares.filter((share) => share.percent > 0);
  for (const share of active) {
    if (!agentIds.has(share.userId)) {
      throw new Error("Το μοίρασμα αφορά μόνο ενεργούς sales agents");
    }
    if (
      !Number.isInteger(share.percent) ||
      share.percent < 1 ||
      share.percent > 100
    ) {
      throw new Error(`${label}: κάθε ποσοστό πρέπει να είναι ακέραιος από 1 έως 100`);
    }
  }
  const total = active.reduce((sum, share) => sum + share.percent, 0);
  if (total !== 100) {
    throw new Error(`${label}: τα ποσοστά πρέπει να αθροίζουν σε 100`);
  }
  if (active.length === 0) {
    throw new Error(`${label}: προσθέστε τουλάχιστον έναν sales agent`);
  }
  return active;
}

export async function saveLeadDistribution(
  organizationId: string,
  input: {
    enabled: boolean;
    sourceIds: string[];
    shares: { userId: string; percent: number }[];
    campaigns?: { campaignName: string; shares: { userId: string; percent: number }[] }[];
  }
) {
  const settings = await getLeadDistribution(organizationId);
  const agentIds = new Set(settings.agents.map((agent) => agent.userId));
  const sourceIds = new Set(settings.sources.map((source) => source.id));

  const shares = input.enabled
    ? validateShares(input.shares, agentIds, "Το προεπιλεγμένο μοίρασμα")
    : input.shares.filter((share) => share.percent > 0);

  if (!input.enabled) {
    for (const share of shares) {
      if (!agentIds.has(share.userId)) {
        throw new Error("Το μοίρασμα αφορά μόνο ενεργούς sales agents");
      }
      if (
        !Number.isInteger(share.percent) ||
        share.percent < 1 ||
        share.percent > 100
      ) {
        throw new Error("Κάθε ποσοστό πρέπει να είναι ακέραιος από 1 έως 100");
      }
    }
  }

  const seenCampaigns = new Set<string>();
  const campaignRows: { campaignName: string; userId: string; percent: number }[] = [];
  for (const campaign of input.campaigns ?? []) {
    const campaignName = campaign.campaignName.trim();
    if (!campaignName) continue;
    if (seenCampaigns.has(campaignName)) {
      throw new Error(`Η καμπάνια «${campaignName}» υπάρχει ήδη`);
    }
    seenCampaigns.add(campaignName);
    const positive = campaign.shares.filter((share) => share.percent > 0);
    if (!input.enabled && positive.length === 0) continue;
    const campaignShares = validateShares(
      campaign.shares,
      agentIds,
      `Η καμπάνια «${campaignName}»`
    );
    for (const share of campaignShares) {
      campaignRows.push({ campaignName, userId: share.userId, percent: share.percent });
    }
  }

  const selectedSources = [...new Set(input.sourceIds)];
  if (selectedSources.some((sourceId) => !sourceIds.has(sourceId))) {
    throw new Error("Μη έγκυρη πηγή");
  }

  await db.$transaction(async (tx) => {
    await tx.leadDistribution.upsert({
      where: { organizationId },
      create: { organizationId, enabled: input.enabled },
      update: { enabled: input.enabled },
    });
    await tx.leadShare.deleteMany({ where: { organizationId } });
    if (shares.length > 0) {
      await tx.leadShare.createMany({
        data: shares.map((share) => ({
          organizationId,
          userId: share.userId,
          percent: share.percent,
        })),
      });
    }
    await tx.leadCampaignShare.deleteMany({ where: { organizationId } });
    if (campaignRows.length > 0) {
      await tx.leadCampaignShare.createMany({
        data: campaignRows.map((share) => ({
          organizationId,
          campaignName: share.campaignName,
          userId: share.userId,
          percent: share.percent,
        })),
      });
    }
    await tx.leadDistributionSource.deleteMany({ where: { organizationId } });
    if (selectedSources.length > 0) {
      await tx.leadDistributionSource.createMany({
        data: selectedSources.map((sourceId) => ({
          organizationId,
          sourceId,
        })),
      });
    }
  });
}

function selectByGap(
  shares: { userId: string; percent: number }[],
  countByUser: Map<string | null, number>
) {
  const total = [...countByUser.values()].reduce((sum, count) => sum + count, 0);
  let selected = shares[0];
  let largestGap = Number.NEGATIVE_INFINITY;
  for (const share of shares) {
    const actual = total === 0 ? 0 : (countByUser.get(share.userId) ?? 0) / total;
    const gap = share.percent / 100 - actual;
    if (gap > largestGap) {
      largestGap = gap;
      selected = share;
    }
  }
  return selected.userId;
}

export async function pickDistributedAgent(
  organizationId: string,
  sourceId: string,
  campaignName?: string | null
) {
  const distribution = await db.leadDistribution.findUnique({
    where: { organizationId },
  });
  if (!distribution?.enabled) return null;

  const [defaultShares, sourceLinks, campaignShares] = await Promise.all([
    db.leadShare.findMany({ where: { organizationId, percent: { gt: 0 } } }),
    db.leadDistributionSource.findMany({ where: { organizationId } }),
    db.leadCampaignShare.findMany({ where: { organizationId, percent: { gt: 0 } } }),
  ]);

  if (
    sourceLinks.length > 0 &&
    !sourceLinks.some((link) => link.sourceId === sourceId)
  ) {
    return null;
  }

  const campaign = campaignName?.trim() || "";
  const specificShares = campaign
    ? campaignShares.filter((share) => share.campaignName === campaign)
    : [];
  const shares = specificShares.length > 0 ? specificShares : defaultShares;
  const configuredCampaigns = [
    ...new Set(campaignShares.map((share) => share.campaignName)),
  ];

  const profiles = await db.userProfile.findMany({
    where: {
      organizationId,
      userId: { in: shares.map((share) => share.userId) },
    },
  });
  const blocked = new Set(
    profiles.filter((profile) => profile.blocked).map((profile) => profile.userId)
  );
  const activeShares = shares.filter((share) => !blocked.has(share.userId));
  if (activeShares.length === 0) return null;

  const counts = await db.lead.groupBy({
    by: ["assignedUserId"],
    where: {
      organizationId,
      assignedUserId: { in: activeShares.map((share) => share.userId) },
      createdAt: distributionDayRange(),
      ...(sourceLinks.length > 0
        ? { sourceId: { in: sourceLinks.map((link) => link.sourceId) } }
        : {}),
      ...(specificShares.length > 0
        ? { campaignName: campaign }
        : configuredCampaigns.length > 0
          ? {
              OR: [
                { campaignName: null },
                { campaignName: { notIn: configuredCampaigns } },
              ],
            }
          : {}),
    },
    _count: { _all: true },
  });
  const countByUser = new Map(
    counts.map((row) => [row.assignedUserId, row._count._all])
  );
  return selectByGap(activeShares, countByUser);
}
