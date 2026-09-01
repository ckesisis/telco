import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/tenancy";

export default async function HomePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  redirect("/dashboard");
}
