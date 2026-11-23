"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  pin: string;
}

interface RosterManagerProps {
  periodId: string;
  students: RosterStudent[];
  /** The teacher's students who are not in this period yet */
  otherStudents: RosterStudent[];
}

export function RosterManager({ periodId, students, otherStudents }: RosterManagerProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [names, setNames] = useState("");
  const [existingId, setExistingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");

  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAddNames(e: React.FormEvent) {
    e.preventDefault();
    if (await send(`/api/periods/${periodId}/students`, "POST", { names })) {
      setNames("");
    }
  }

  async function handleAddExisting() {
    if (!existingId) return;
    if (await send(`/api/periods/${periodId}/students`, "POST", { studentId: existingId })) {
      setExistingId("");
    }
  }

  function startEdit(s: RosterStudent) {
    setEditingId(s.id);
    setEditFirst(s.firstName);
    setEditLast(s.lastName);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (await send(`/api/students/${editingId}`, "PATCH", { firstName: editFirst, lastName: editLast })) {
      setEditingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Students ({students.length})
        </p>
        <div className="flex gap-2">
          {students.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/periods/${periodId}/sign-in-sheet`} target="_blank">
                Print sign-in sheet
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? "Done" : "Add students"}
          </Button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 space-y-4">
          <form onSubmit={handleAddNames} className="space-y-2">
            <p className="text-sm text-slate-700">
              Paste or type names, one per line. &ldquo;First Last&rdquo; or &ldquo;Last, First&rdquo;.
            </p>
            <Textarea
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={5}
              placeholder={"Jordan Lee\nGonzalez, Maria"}
              className="bg-white"
            />
            <Button type="submit" size="sm" disabled={busy || !names.trim()}>
              Add to class
            </Button>
          </form>

          {otherStudents.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">Or add a student from another section</p>
              <div className="flex gap-2">
                <select
                  value={existingId}
                  onChange={(e) => setExistingId(e.target.value)}
                  className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  <option value="">Choose a student…</option>
                  {otherStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddExisting} disabled={busy || !existingId}>
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {students.length === 0 ? (
        <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg px-4 py-6 text-center">
          No students yet. Add your class list so students can sign in.
        </p>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
          {students.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2">
              {editingId === s.id ? (
                <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
                  <Input
                    autoFocus
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    placeholder="First"
                    className="h-7 text-sm"
                  />
                  <Input
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    placeholder="Last"
                    className="h-7 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={busy || !editFirst.trim()}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <Link
                    href={`/students/${s.id}`}
                    className="text-sm text-slate-800 flex-1 hover:underline"
                  >
                    {s.firstName} {s.lastName}
                  </Link>
                  <span className="text-xs text-slate-500">
                    PIN <span className="font-mono text-slate-800">{s.pin}</span>
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500" onClick={() => startEdit(s)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-500"
                    disabled={busy}
                    onClick={() => send(`/api/students/${s.id}`, "PATCH", { resetPin: true })}
                  >
                    New PIN
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    disabled={busy}
                    onClick={() => send(`/api/periods/${periodId}/students/${s.id}`, "DELETE")}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
