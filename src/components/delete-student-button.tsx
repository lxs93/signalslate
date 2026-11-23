"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteStudentButton({ studentId, name }: { studentId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${name} and all of their answers? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/students");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={busy}
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      Delete student
    </Button>
  );
}
