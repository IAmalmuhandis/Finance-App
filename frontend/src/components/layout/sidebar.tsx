"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/reports", label: "Reports" },
  { href: "/chat", label: "Chat" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 border-r bg-white p-4">
      <div className="mb-6 text-lg font-semibold">Finance OS</div>
      <nav className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "block rounded px-3 py-2 text-sm",
              pathname.startsWith(it.href) ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            )}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
