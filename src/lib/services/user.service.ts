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
  const contactPhone = data.contactPhone?.trim() || null;
  if (data.role === "member" && !contactPhone) {
    throw new Error("Το τηλέφωνο είναι υποχρεωτικό για sales agent");
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
      contactPhone,
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

    if (data.salesCode || contactPhone) {
      await tx.userProfile.create({
        data: {
          organizationId,
          userId: created.id,
          salesCode: data.salesCode || null,
          contactPhone,
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
    name?: string;
    email?: string;
    password?: string | null;
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

  const nextRole = data.role ?? member.role;
  const existingProfile = await db.userProfile.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  const nextPhone =
    data.contactPhone !== undefined
      ? data.contactPhone?.trim() || null
      : existingProfile?.contactPhone ?? null;
  if (nextRole === "member" && !nextPhone) {
    throw new Error("Το τηλέφωνο είναι υποχρεωτικό για sales agent");
  }

  if (data.name !== undefined || data.email !== undefined) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Δεν βρέθηκε ο χρήστης");

    const name = data.name !== undefined ? data.name.trim() : user.name;
    const email = data.email !== undefined ? data.email.trim().toLowerCase() : user.email;
    if (!name) throw new Error("Το όνομα είναι υποχρεωτικό");
    if (!email) throw new Error("Το email είναι υποχρεωτικό");

    if (email !== user.email) {
      const taken = await db.user.findUnique({ where: { email } });
      if (taken) throw new Error("Το email χρησιμοποιείται ήδη");
    }

    await db.user.update({
      where: { id: userId },
      data: { name, email },
    });
  }

  const nextPassword = data.password?.trim();
  if (nextPassword) {
    if (nextPassword.length < 8) {
      throw new Error("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες");
    }
    const passwordHash = await hashPassword(nextPassword);
    const account = await db.account.findFirst({
      where: { userId, providerId: "credential" },
    });
    if (account) {
      await db.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });
    } else {
      const issuer = createLocalAccountIssuer("credential");
      await db.account.create({
        data: {
          userId,
          accountId: userId,
          providerId: "credential",
          issuer,
          password: passwordHash,
        },
      });
    }
  }

  if (data.role !== undefined && data.role !== member.role) {
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
      contactPhone:
        data.contactPhone !== undefined
          ? data.contactPhone?.trim() || null
          : undefined,
    });
  }
}
