import { redirect } from "next/navigation";
import { getSession, resolveAccess } from "@/lib/tenancy";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const access = await resolveAccess({
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
  });

  if (access.kind === "tenant") redirect("/dashboard");
  if (access.kind === "platform") redirect("/admin");
  redirect("/login");
}
