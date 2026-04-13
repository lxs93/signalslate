"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassPeriod } from "@/generated/prisma/client";

interface PeriodManagerProps {
  periods: ClassPeriod[];
}

export function PeriodManager({ periods }: PeriodManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Failed to create period");
    } else {
      setNewName("");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/periods/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        {open ? "Done" : "Manage periods"}
      </button>

      {open && (
        <div className="mt-4 mb-6 bg-slate-50 border border-slate-200 rounded-lg px-4 py-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Class periods
          </p>

          {periods.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">No periods yet.</p>
          )}

          <div className="space-y-1.5 mb-4">
            {periods.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 py-2"
              >
                <span className="text-sm text-slate-800">{p.name}</span>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-4"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Period 1"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" disabled={loading || !newName.trim()}>
              Add
            </Button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
