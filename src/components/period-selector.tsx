"use client";

import { useEffect, useId, useRef, useState } from "react";
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

  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape or a click outside, like any other menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const label = selected.size === 0
    ? "Unassigned"
    : periods.filter((p) => selected.has(p.id)).map((p) => p.name).join(", ");

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
      >
        <span className="text-slate-500">Section:</span>
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div id={menuId} className="absolute right-0 top-6 z-10 bg-white border border-slate-200 rounded-lg shadow-md p-2 min-w-36">
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
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="w-full text-left px-2 py-1 text-xs text-slate-500 hover:text-slate-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
