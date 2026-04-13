"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
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
      setError("Failed to create section");
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

  function startEdit(p: ClassPeriod) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  async function handleRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    await fetch(`/api/periods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Done" : "Manage sections"}
      </Button>

      {open && (
        <div className="mt-4 mb-6 bg-slate-50 border border-slate-200 rounded-lg px-4 py-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Sections
          </p>

          {periods.length === 0 && (
            <p className="text-sm text-slate-400 mb-3">No sections yet.</p>
          )}

          <div className="space-y-1.5 mb-4">
            {periods.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 py-2 gap-2"
              >
                {editingId === p.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(p.id); }}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-7 text-sm"
                    />
                    <Button type="submit" size="sm" className="h-7 text-xs" disabled={!editingName.trim()}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="text-sm text-slate-800 flex-1">{p.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(p)}
                      className="h-7 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      className={cn("h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50")}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Period 1 or Math"
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
