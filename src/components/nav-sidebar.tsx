"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Exit Tickets" },
  { href: "/trends", label: "Trends" },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-5 py-5">
        <span className="text-base font-bold text-slate-900 tracking-tight">SignalSlate</span>
      </div>
      <Separator />
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
