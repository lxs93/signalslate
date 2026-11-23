"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function StudentHeader({ name }: { name: string }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/student" className="text-base font-bold text-slate-900 tracking-tight">
          SignalSlate
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{name}</span>
          <button
            onClick={async () => {
            // Redirect in the browser so it works from any host (localhost or LAN IP)
            await signOut({ redirect: false });
            window.location.href = "/student/login";
          }}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
