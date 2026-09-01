import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

export function generateApiKeySecret() {
  return `tc_${randomBytes(24).toString("hex")}`;
}

export function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function listApiKeys(organizationId: string) {
  return db.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      secret: true,
      enabled: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function createApiKey(organizationId: string, name: string) {
  const secret = generateApiKeySecret();
  return db.apiKey.create({
    data: {
      organizationId,
      name: name.trim() || "Ingest",
      keyPrefix: secret.slice(0, 8),
      keyHash: hashApiKey(secret),
      secret,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      secret: true,
      enabled: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}
