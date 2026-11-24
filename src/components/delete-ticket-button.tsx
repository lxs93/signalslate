"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteTicketButton({
  ticketId,
  title,
  submissionCount,
}: {
  ticketId: string;
  title: string;
  submissionCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const answers =
      submissionCount > 0
        ? ` and its ${submissionCount} student ${submissionCount === 1 ? "response" : "responses"}`
        : "";
    if (!confirm(`Delete "${title}"${answers}? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
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
      Delete ticket
    </Button>
  );
}
