import { db } from "@/lib/db";
import { getMemberProfiles } from "@/lib/services/catalog.service";

export async function getLeadDistribution(organizationId: string) {
  const [distribution, shares, sources, members, catalogSources] =
    await Promise.all([
      db.leadDistribution.findUnique({ where: { organizationId } }),
      db.leadShare.findMany({ where: { organizationId } }),
      db.leadDistributionSource.findMany({ where: { organizationId } }),
      getMemberProfiles(organizationId),
      db.source.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),
    ]);

  return {
    enabled: distribution?.enabled ?? false,
    sourceIds: sources.map((source) => source.sourceId),
    shares: shares.map((share) => ({
      userId: share.userId,
      percent: share.percent,
    })),
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

export async function saveLeadDistribution(
  organizationId: string,
  input: {
    enabled: boolean;
    sourceIds: string[];
    shares: { userId: string; percent: number }[];
  }
) {
  const settings = await getLeadDistribution(organizationId);
  const agentIds = new Set(settings.agents.map((agent) => agent.userId));
  const sourceIds = new Set(settings.sources.map((source) => source.id));

  const shares = input.shares.filter((share) => share.percent > 0);
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

  const total = shares.reduce((sum, share) => sum + share.percent, 0);
  if (input.enabled && total !== 100) {
    throw new Error("Τα ποσοστά πρέπει να αθροίζουν σε 100");
  }
  if (input.enabled && shares.length === 0) {
    throw new Error("Προσθέστε τουλάχιστον έναν sales agent");
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

export async function pickDistributedAgent(
  organizationId: string,
  sourceId: string
) {
  const distribution = await db.leadDistribution.findUnique({
    where: { organizationId },
  });
  if (!distribution?.enabled) return null;

  const [shares, sourceLinks] = await Promise.all([
    db.leadShare.findMany({ where: { organizationId, percent: { gt: 0 } } }),
    db.leadDistributionSource.findMany({ where: { organizationId } }),
  ]);

  if (
    sourceLinks.length > 0 &&
    !sourceLinks.some((link) => link.sourceId === sourceId)
  ) {
    return null;
  }

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
      ...(sourceLinks.length > 0
        ? { sourceId: { in: sourceLinks.map((link) => link.sourceId) } }
        : {}),
    },
    _count: { _all: true },
  });
  const countByUser = new Map(
    counts.map((row) => [row.assignedUserId, row._count._all])
  );
  const total = [...countByUser.values()].reduce((sum, count) => sum + count, 0);

  let selected = activeShares[0];
  let largestGap = Number.NEGATIVE_INFINITY;
  for (const share of activeShares) {
    const actual =
      total === 0 ? 0 : (countByUser.get(share.userId) ?? 0) / total;
    const gap = share.percent / 100 - actual;
    if (gap > largestGap) {
      largestGap = gap;
      selected = share;
    }
  }

  return selected.userId;
}
