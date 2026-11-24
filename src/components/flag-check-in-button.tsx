"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Toggles whether the teacher has checked in with a flagged student. */
export function FlagCheckInButton({ flagId, resolved }: { flagId: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/flags/${flagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !resolved }),
    });
    if (res.ok) router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
        resolved
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-white hover:text-slate-600 hover:border-slate-300"
          : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
      }`}
      title={resolved ? "Mark as not checked in" : "Mark that you've checked in with this student"}
    >
      {resolved ? "Checked in ✓" : "Mark checked in"}
    </button>
  );
}
