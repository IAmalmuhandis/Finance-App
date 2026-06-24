"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LogOut, Menu, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ArzoBrand } from "@/components/ArzoBrand";

const nav = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 px-3" aria-label="Main">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-[14px] border-l-2 px-4 py-2.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              active
                ? "border-l-gold bg-jade text-text-on-jade"
                : "border-l-transparent text-[#9DB1A8] hover:bg-jade hover:text-text-on-jade"
            }`}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ onSignOut }: { onSignOut?: () => void }) {
  const { data: session } = useSession();
  const email = session?.user?.email ?? "Account";

  return (
    <div className="shrink-0 border-t border-[#1C4A40] p-4">
      <p className="truncate text-xs font-medium text-text-on-jade" title={email}>
        {email}
      </p>
      <button
        type="button"
        onClick={() => {
          onSignOut?.();
          void signOut({ callbackUrl: "/" });
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#1C4A40] bg-jade py-2 text-xs font-medium text-[#9DB1A8] transition hover:text-text-on-jade focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <LogOut size={14} strokeWidth={1.75} aria-hidden />
        Sign out
      </button>
    </div>
  );
}

const sidebarClass =
  "flex h-full w-[240px] flex-col border-r border-[#1C4A40] bg-jade-deep text-text-on-jade";

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-[12px] border border-border-subtle bg-bg-surface p-2 text-jade md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        aria-label="Open menu"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <aside className={`fixed inset-y-0 left-0 hidden md:flex ${sidebarClass}`}>
        <div className="shrink-0 border-b border-[#1C4A40] px-5 py-5">
          <ArzoBrand markSize={32} variant="on-jade" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          <SidebarNav />
        </div>
        <UserFooter />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 bg-jade-deep/60 md:hidden" role="presentation" onClick={() => setOpen(false)}>
          <aside className={sidebarClass} onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 border-b border-[#1C4A40]">
              <div className="flex items-center justify-between px-5 py-5">
                <ArzoBrand markSize={32} variant="on-jade" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[#9DB1A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-3">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter onSignOut={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
