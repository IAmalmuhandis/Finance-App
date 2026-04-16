"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Building2,
  LayoutDashboard,
  List,
  Menu,
  MessageSquare,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-2 px-3">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
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

      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-border-subtle bg-[#080D1A] md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5 text-text-primary">
          <TrendingUp className="text-accent-blue" size={18} />
          <span className="text-[18px] font-semibold">Finance OS</span>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-sm font-semibold">DU</div>
            <div>
              <p className="text-xs text-text-primary">Demo User</p>
              <p className="text-xs text-text-secondary">demo@financeos.local</p>
            </div>
          </div>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <aside className="h-full w-[240px] border-r border-border-subtle bg-[#080D1A]">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2 text-text-primary">
                <TrendingUp className="text-accent-blue" size={18} />
                <span className="text-[18px] font-semibold">Finance OS</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-text-secondary">
                <X size={18} />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

