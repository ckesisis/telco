import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallIngestLog } from "@/app/(dashboard)/settings/organization/call-ingest-log";
import { db } from "@/lib/db";
import { listRecentCallEvents } from "@/lib/services/call.service";
import {
  CALL_INGEST_OWNER_EMAIL,
  CALL_INGEST_SHARE_COOKIE,
  isCallIngestShareUnlocked,
} from "@/lib/call-ingest-share";
import { AutoRefresh } from "./auto-refresh";
import { UnlockForm } from "./unlock-form";

export const dynamic = "force-dynamic";

async function ownerOrganizationId() {
  const user = await db.user.findUnique({
    where: { email: CALL_INGEST_OWNER_EMAIL },
    select: {
      members: {
        where: { role: "owner" },
        select: { organizationId: true, organization: { select: { name: true } } },
        take: 1,
      },
    },
  });
  const membership = user?.members[0];
  if (!membership) return null;
  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
  };
}

export default async function CallIngestSharePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const unlocked = isCallIngestShareUnlocked(
    cookieStore.get(CALL_INGEST_SHARE_COOKIE)?.value
  );

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Call ingest</CardTitle>
            <p className="text-sm text-slate-500">
              Payloads for {CALL_INGEST_OWNER_EMAIL}. No account required.
            </p>
          </CardHeader>
          <CardContent>
            <UnlockForm error={error} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const owner = await ownerOrganizationId();
  const events = owner
    ? await listRecentCallEvents(owner.organizationId)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <AutoRefresh />
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Call ingest</h1>
          <p className="text-sm text-slate-500">
            {CALL_INGEST_OWNER_EMAIL}
            {owner ? ` · ${owner.organizationName}` : ""}
            {" · refreshes every 5s"}
          </p>
        </div>
        {owner ? (
          <CallIngestLog events={events} />
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-slate-500">
              No organization found for {CALL_INGEST_OWNER_EMAIL}.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
