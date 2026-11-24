"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FEEDBACK_LENGTH } from "@/lib/validations";

interface FeedbackEditorProps {
  ticketId: string;
  submissionId: string;
  firstName: string;
  initial: string | null;
}

/** The teacher's note to one student, shown to the student with their answers. */
export function FeedbackEditor({ ticketId, submissionId, firstName, initial }: FeedbackEditorProps) {
  const router = useRouter();
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(value: string) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save the note. Please try again.");
        return;
      }
      setText(value.trim());
      setSaved(value.trim());
      router.refresh();
    } catch {
      setError("Couldn't save the note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const dirty = text.trim() !== saved;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(text);
      }}
      className="space-y-2"
    >
      <label htmlFor="feedback" className="block text-sm font-medium text-slate-900">
        Note to {firstName}
      </label>
      <p className="text-xs text-slate-500">{firstName} sees this with their answers.</p>
      <Textarea
        id="feedback"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_FEEDBACK_LENGTH}
        rows={3}
        placeholder="e.g. Nice use of the tape diagram. Check which numbers you're comparing in a ratio."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving || !dirty}>
          {saving ? "Saving…" : saved ? "Update note" : "Send note"}
        </Button>
        {saved && !dirty && <span className="text-xs text-emerald-700">Sent</span>}
        {saved && (
          <button
            type="button"
            onClick={() => save("")}
            disabled={saving}
            className="ml-auto text-xs text-slate-500 underline hover:text-slate-900"
          >
            Remove note
          </button>
        )}
      </div>
    </form>
  );
}
