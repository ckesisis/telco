import { db } from "@/lib/db";
import { seedOrganizationCatalog } from "@/lib/services/org.service";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

export function parseOrganizationInput(body: { name?: string; slug?: string }) {
  const name = body.name?.trim() ?? "";
  const slug = body.slug?.trim().toLowerCase() ?? "";
  if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Το slug πρέπει να περιέχει μόνο πεζά λατινικά, αριθμούς και παύλες"
    );
  }
  return { name, slug };
}

export async function listOrganizations() {
  return db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          customers: true,
          leads: true,
          orders: true,
        },
      },
    },
  });
}

export async function createOrganization(name: string, slug: string) {
  try {
    const organization = await db.organization.create({
      data: { name, slug },
    });
    await seedOrganizationCatalog(organization.id);
    return organization;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("Υπάρχει ήδη οργανισμός με αυτό το slug");
    }
    throw err;
  }
}

export async function updateOrganization(
  id: string,
  name: string,
  slug: string
) {
  const existing = await db.organization.findUnique({ where: { id } });
  if (!existing) throw new Error("Ο οργανισμός δεν βρέθηκε");

  try {
    return await db.organization.update({
      where: { id },
      data: { name, slug },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("Υπάρχει ήδη οργανισμός με αυτό το slug");
    }
    throw err;
  }
}

export async function deleteOrganization(organizationId: string) {
  const existing = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!existing) throw new Error("Ο οργανισμός δεν βρέθηκε");

  await db.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: { activeOrganizationId: organizationId },
      data: { activeOrganizationId: null },
    });

    const [applications, orders] = await Promise.all([
      tx.application.findMany({
        where: { organizationId },
        select: { installationAddressId: true },
      }),
      tx.order.findMany({
        where: { organizationId },
        select: { shippingAddressId: true },
      }),
    ]);

    await tx.log.deleteMany({ where: { organizationId } });
    await tx.callEvent.deleteMany({ where: { organizationId } });
    await tx.order.deleteMany({ where: { organizationId } });

    const installationIds = applications
      .map((application) => application.installationAddressId)
      .filter((id): id is string => Boolean(id));
    if (installationIds.length > 0) {
      await tx.installationAddress.deleteMany({
        where: { id: { in: installationIds } },
      });
    }
    if (orders.length > 0) {
      await tx.shippingAddress.deleteMany({
        where: { id: { in: orders.map((order) => order.shippingAddressId) } },
      });
    }

    await tx.leadComment.deleteMany({ where: { organizationId } });
    await tx.leadDistributionSource.deleteMany({ where: { organizationId } });
    await tx.leadShare.deleteMany({ where: { organizationId } });
    await tx.leadDistribution.deleteMany({ where: { organizationId } });
    await tx.lead.deleteMany({ where: { organizationId } });
    await tx.customer.deleteMany({ where: { organizationId } });
    await tx.offer.deleteMany({ where: { organizationId } });
    await tx.appStatus.deleteMany({ where: { organizationId } });
    await tx.source.deleteMany({ where: { organizationId } });
    await tx.apiKey.deleteMany({ where: { organizationId } });
    await tx.userProfile.deleteMany({ where: { organizationId } });
    await tx.invitation.deleteMany({ where: { organizationId } });
    await tx.member.deleteMany({ where: { organizationId } });
    await tx.organization.delete({ where: { id: organizationId } });
  });
}

export async function setActiveOrganization(
  sessionToken: string,
  organizationId: string | null
) {
  if (organizationId) {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) throw new Error("Ο οργανισμός δεν βρέθηκε");
  }

  await db.session.update({
    where: { token: sessionToken },
    data: { activeOrganizationId: organizationId },
  });
}
