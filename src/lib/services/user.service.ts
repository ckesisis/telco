import { createLocalAccountIssuer } from "@better-auth/core/db";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import type { AssignableRole } from "@/config/roles";
import { isAssignableRole } from "@/config/roles";
import { upsertUserProfile } from "@/lib/services/catalog.service";

export async function createOrganizationUser(
  organizationId: string,
  data: {
    name: string;
    email: string;
    password: string;
    role: string;
    salesCode?: string | null;
    contactPhone?: string | null;
  }
) {
  if (!isAssignableRole(data.role)) {
    throw new Error("Μη έγκυρος ρόλος");
  }

  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
  if (!email) throw new Error("Το email είναι υποχρεωτικό");
  if (data.password.length < 8) {
    throw new Error("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες");
  }

  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    const existingMember = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: existingUser.id,
        },
      },
    });
    if (existingMember) {
      throw new Error("Ο χρήστης ανήκει ήδη στον οργανισμό");
    }

    await db.member.create({
      data: {
        organizationId,
        userId: existingUser.id,
        role: data.role,
      },
    });

    await upsertUserProfile(organizationId, existingUser.id, {
      salesCode: data.salesCode || null,
      contactPhone: data.contactPhone || null,
    });

    return existingUser;
  }

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: true,
      },
    });

    const issuer = createLocalAccountIssuer("credential");
    const passwordHash = await hashPassword(data.password);

    await tx.account.create({
      data: {
        userId: created.id,
        accountId: created.id,
        providerId: "credential",
        issuer,
        password: passwordHash,
      },
    });

    await tx.member.create({
      data: {
        organizationId,
        userId: created.id,
        role: data.role,
      },
    });

    if (data.salesCode || data.contactPhone) {
      await tx.userProfile.create({
        data: {
          organizationId,
          userId: created.id,
          salesCode: data.salesCode || null,
          contactPhone: data.contactPhone || null,
        },
      });
    }

    return created;
  });

  return user;
}

export async function updateOrganizationUser(
  organizationId: string,
  userId: string,
  actingUserId: string,
  data: {
    role?: string;
    salesCode?: string | null;
    contactPhone?: string | null;
  }
) {
  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });

  if (!member) throw new Error("Δεν βρέθηκε ο χρήστης");

  if (data.role !== undefined) {
    if (!isAssignableRole(data.role)) {
      throw new Error("Μη έγκυρος ρόλος");
    }
    if (member.role === "owner") {
      throw new Error("Δεν μπορείτε να αλλάξετε τον ρόλο του ιδιοκτήτη");
    }
    if (userId === actingUserId) {
      throw new Error("Δεν μπορείτε να αλλάξετε τον δικό σας ρόλο");
    }

    const isDemotingAdmin =
      (member.role === "admin" || member.role === "owner") &&
      data.role === "member";

    if (isDemotingAdmin) {
      const adminCount = await db.member.count({
        where: {
          organizationId,
          role: { in: ["owner", "admin"] },
        },
      });
      if (adminCount <= 1) {
        throw new Error("Πρέπει να υπάρχει τουλάχιστον ένας διαχειριστής");
      }
    }

    await db.member.update({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      data: { role: data.role as AssignableRole },
    });
  }

  if (data.salesCode !== undefined || data.contactPhone !== undefined) {
    await upsertUserProfile(organizationId, userId, {
      salesCode: data.salesCode,
      contactPhone: data.contactPhone,
    });
  }
}
