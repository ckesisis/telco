"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Smartphone,
  UserPlus,
  Phone,
  BarChart3,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads/calls", label: "Προς κλήση", icon: Phone },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/customers", label: "Πελάτες", icon: Users },
  { href: "/orders", label: "Παραγγελίες", icon: ShoppingCart },
  { href: "/apps", label: "Αιτήσεις", icon: Smartphone },
  { href: "/reporting", label: "Αναφορές", icon: BarChart3 },
];

const settingsItems = [
  { href: "/settings/offers", label: "Προσφορές" },
  { href: "/settings/sources", label: "Πηγές" },
  { href: "/settings/app-statuses", label: "Καταστάσεις" },
  { href: "/settings/users", label: "Χρήστες" },
  { href: "/settings/lead-distribution", label: "Μοίρασμα leads" },
  { href: "/settings/organization", label: "Οργανισμός" },
];

export function AppSidebar({
  organizationName,
  userName,
  isAdmin,
  isSuperAdmin,
}: {
  organizationName: string;
  userName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Telco CRM
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
          {organizationName}
        </p>
        <p className="truncate text-xs text-slate-500">{userName}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === "/leads"
                ? pathname.startsWith("/leads") &&
                  !pathname.startsWith("/leads/calls")
                : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              "mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Shield className="h-4 w-4" />
            Πλατφόρμα
          </Link>
        )}

        {isAdmin && (
          <div className="pt-4">
            <p className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Settings className="h-3 w-3" />
              Ρυθμίσεις
            </p>
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Αποσύνδεση
        </Button>
      </div>
    </aside>
  );
}
