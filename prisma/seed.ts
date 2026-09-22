import "dotenv/config";
import { createHash, randomBytes } from "crypto";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { seedOrganizationCatalog } from "@/lib/services/org.service";

async function ensureCredentialUser(
  email: string,
  password: string,
  name: string,
  isSuperAdmin = false
) {
  const issuer = createLocalAccountIssuer("credential");
  const passwordHash = await hashPassword(password);

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        isSuperAdmin,
      },
    });
    console.log(`Created user: ${email}`);
  } else if (user.isSuperAdmin !== isSuperAdmin) {
    user = await db.user.update({
      where: { id: user.id },
      data: { isSuperAdmin },
    });
  }

  await db.account.deleteMany({
    where: { userId: user.id, providerId: "credential" },
  });
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      issuer,
      password: passwordHash,
    },
  });

  return user;
}

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@demo.telco";
  const password = process.env.SEED_OWNER_PASSWORD ?? "password123";
  const orgName = process.env.SEED_ORG_NAME ?? "Demo Telecom";
  const orgSlug = process.env.SEED_ORG_SLUG ?? "demo-telecom";

  const user = await ensureCredentialUser(email, password, "Demo Owner");

  let org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
      },
    });
    await seedOrganizationCatalog(org.id);
    console.log(`Created organization: ${orgName}`);
  }

  const member = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
  });
  if (!member) {
    await db.member.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });
    console.log("Added owner membership");
  }

  await db.userProfile.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      salesCode: "DEMO001",
      contactPhone: "6900000000",
    },
    update: {},
  });

  const existingKey = await db.apiKey.findFirst({
    where: { organizationId: org.id, name: "Default Ingest" },
  });
  if (!existingKey) {
    const rawKey = `tc_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    await db.apiKey.create({
      data: {
        organizationId: org.id,
        name: "Default Ingest",
        keyPrefix: rawKey.slice(0, 8),
        keyHash,
        secret: rawKey,
      },
    });
    console.log(`API Key (save this): ${rawKey}`);
  }

  // Demo catalog data
  const offerCount = await db.offer.count({ where: { organizationId: org.id } });
  if (offerCount === 0) {
    await db.offer.createMany({
      data: [
        {
          organizationId: org.id,
          code: "PREPAID_BASIC",
          name: "Prepaid Basic 60GB",
          productLine: "prepaid_mobile",
          prepaidGroup: "free2go",
          enabled: true,
        },
        {
          organizationId: org.id,
          code: "POSTPAID_VIP",
          name: "PostPaid VIP",
          productLine: "postpaid_mobile",
          catalogMonthlyAmount: 29.99,
          enabled: true,
        },
        {
          organizationId: org.id,
          code: "FIXED_HOME",
          name: "Fixed Home Line",
          productLine: "fixed_telephony",
          catalogMonthlyAmount: 19.99,
          enabled: true,
        },
      ],
    });
    console.log("Seeded demo offers");
  }

  const superAdminEmail =
    process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@demo.telco";
  const superAdminPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? "password123";
  await ensureCredentialUser(
    superAdminEmail,
    superAdminPassword,
    "Super Admin",
    true
  );

  console.log("\nSeed complete!");
  console.log(`Login: ${email} / ${password}`);
  console.log(`Super admin: ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`Organization: ${orgName}`);

  // Second org for tenant isolation proof
  const org2Slug = "acme-telecom";
  let org2 = await db.organization.findUnique({ where: { slug: org2Slug } });
  if (!org2) {
    org2 = await db.organization.create({
      data: { name: "Acme Telecom", slug: org2Slug },
    });
    await seedOrganizationCatalog(org2.id);
    await db.member.create({
      data: { organizationId: org2.id, userId: user.id, role: "admin" },
    });
    console.log("Created second organization: Acme Telecom (same user is admin)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
