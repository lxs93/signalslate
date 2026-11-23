"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  // Period and ticket pages live under Exit Tickets
  { href: "/dashboard", label: "Exit Tickets", also: ["/periods", "/tickets"] },
  { href: "/students", label: "Students", also: [] },
  { href: "/trends", label: "Trends", also: [] },
];

async function handleSignOut() {
  // Redirect in the browser so it works from any host (localhost or LAN IP)
  await signOut({ redirect: false });
  window.location.href = "/login";
}

/** Sidebar on md+ screens, a top bar with the same links on phones. */
export function NavSidebar() {
  const pathname = usePathname();
  const isActive = (item: (typeof navItems)[number]) =>
    [item.href, ...item.also].some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <>
      <aside className="print:hidden hidden md:flex fixed top-0 left-0 h-screen w-56 bg-white border-r border-slate-200 flex-col">
        <div className="px-5 py-5">
          <span className="text-base font-bold text-slate-900 tracking-tight">SignalSlate</span>
        </div>
        <Separator />
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item)
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <Separator className="mb-4" />
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <header className="print:hidden md:hidden sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-12">
          <span className="text-base font-bold text-slate-900 tracking-tight">SignalSlate</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Sign out
          </button>
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item) ? "bg-slate-100 text-slate-900" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
