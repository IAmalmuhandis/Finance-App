"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Building2, LayoutDashboard, List, LogOut, Menu, TrendingUp, Upload, X } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { VaultlyBrand } from "@/components/VaultlyBrand";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/tracker", label: "Track & formula", icon: TrendingUp },
];

function initials(name: string | null | undefined, email: string | null | undefined) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-2 px-3">
      {nav.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(item.href + "/") ||
          (item.href === "/tracker" && pathname === "/formula");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg border-l-2 px-4 py-2.5 text-sm transition ${
              active
                ? "border-l-accent-blue bg-bg-elevated text-text-primary"
                : "border-l-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            }`}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ onSignOut }: { onSignOut?: () => void }) {
  const { data: session } = useSession();
  const user = session?.user;
  const label = user?.name?.trim() || user?.email || "Account";
  const sub = user?.email && user?.name?.trim() ? user.email : null;

  return (
    <div className="shrink-0 border-t border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-sm font-semibold text-text-primary">
          {initials(user?.name, user?.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-text-primary">{label}</p>
          {sub ? <p className="truncate text-xs text-text-secondary">{sub}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onSignOut?.();
          void signOut({ callbackUrl: "/" });
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-bg-input py-2 text-xs font-medium text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
      >
        <LogOut size={14} />
        Log out
      </button>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-border-subtle bg-bg-surface p-2 text-text-primary md:hidden"
      >
        <Menu size={18} />
      </button>

      <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r border-border-subtle bg-[#080D1A] md:flex">
        <div className="shrink-0 border-b border-border-subtle/60 px-5 py-5 text-text-primary">
          <VaultlyBrand markSize={28} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <UserFooter />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <aside className="flex h-full w-[240px] flex-col border-r border-border-subtle bg-[#080D1A]">
            <div className="shrink-0 border-b border-border-subtle/60">
              <div className="flex items-center justify-between px-5 py-5 text-text-primary">
                <VaultlyBrand markSize={28} />
                <button type="button" onClick={() => setOpen(false)} className="text-text-secondary" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter onSignOut={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
