"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassPeriod } from "@/generated/prisma/client";

interface PeriodSelectorProps {
  ticketId: string;
  currentPeriodIds: string[];
  periods: ClassPeriod[];
}

export function PeriodSelector({ ticketId, currentPeriodIds, periods }: PeriodSelectorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPeriodIds));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function toggle(periodId: string) {
    const next = new Set(selected);
    if (next.has(periodId)) {
      next.delete(periodId);
    } else {
      next.add(periodId);
    }
    setSelected(next);
    setSaving(true);
    await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodIds: Array.from(next) }),
    });
    setSaving(false);
    router.refresh();
  }

  const label = selected.size === 0
    ? "Unassigned"
    : periods.filter((p) => selected.has(p.id)).map((p) => p.name).join(", ");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
      >
        <span className="text-slate-400">Period:</span>
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-300">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-10 bg-white border border-slate-200 rounded-lg shadow-md p-2 min-w-36">
          {periods.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="rounded"
              />
              {p.name}
            </label>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
