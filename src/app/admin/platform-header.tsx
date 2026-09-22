"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function PlatformHeader({
  userName,
  activeOrganizationName,
}: {
  userName: string;
  activeOrganizationName: string | null;
}) {
  async function handleLogout() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Telco CRM
        </p>
        <p className="text-sm font-semibold text-slate-900">
          Πλατφόρμα · {userName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {activeOrganizationName && (
          <Button asChild variant="outline">
            <Link href="/dashboard">{activeOrganizationName}</Link>
          </Button>
        )}
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Αποσύνδεση
        </Button>
      </div>
    </header>
  );
}
