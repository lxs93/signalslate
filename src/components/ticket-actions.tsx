"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCloseTime, nextTimeAt } from "@/lib/ticket-status";

interface TicketActionsProps {
  ticketId: string;
  isOpen: boolean;
  /** ISO time the ticket closes on its own, if set */
  closesAt: string | null;
  submissionCount: number;
  hasNewSubmissions: boolean;
  hasAnalysis: boolean;
  /** Null when the ticket has no multiple-choice answer key to reveal. */
  revealAnswers: boolean | null;
}

export function TicketActions({
  ticketId,
  isOpen,
  closesAt,
  submissionCount,
  hasNewSubmissions,
  hasAnalysis,
  revealAnswers,
}: TicketActionsProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [closeTime, setCloseTime] = useState("");
  // Formatted in the browser so it's in the teacher's time zone, not the server's
  const closesAtLabel = useSyncExternalStore(
    noSubscribe,
    () => (closesAt ? formatCloseTime(new Date(closesAt)) : ""),
    () => ""
  );

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Analysis failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleToggleClose() {
    setToggling(true);
    try {
      await fetch(`/api/tickets/${ticketId}/close`, { method: "POST" });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleRevealChange(reveal: boolean) {
    setToggling(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealAnswers: reveal }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function saveCloseTime(at: Date | null) {
    setError("");
    setToggling(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closesAt: at ? at.toISOString() : null }),
      });
      if (!res.ok) setError("Couldn't save the close time. Please try again.");
      setCloseTime("");
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  function handleSetCloseTime(e: React.FormEvent) {
    e.preventDefault();
    const at = nextTimeAt(closeTime);
    if (!at) {
      setError("Pick a time to close at.");
      return;
    }
    saveCloseTime(at);
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/s/${ticketId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canAnalyze = submissionCount >= 3;
  const showRerun = hasAnalysis && hasNewSubmissions;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tickets/${ticketId}/edit`}>Edit</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tickets/new?from=${ticketId}`}>Duplicate</Link>
        </Button>
        {submissionCount > 0 && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/tickets/${ticketId}/export`} download>
              Export CSV
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy student link"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleClose}
          disabled={toggling}
        >
          {toggling ? "Updating…" : isOpen ? "Close submissions" : "Reopen submissions"}
        </Button>
      </div>

      {isOpen &&
        (closesAt ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
            <span>
              Closes automatically at{" "}
              <strong className="font-medium">{closesAtLabel}</strong>
            </span>
            <button
              type="button"
              onClick={() => saveCloseTime(null)}
              disabled={toggling}
              className="text-xs text-slate-500 underline hover:text-slate-900"
            >
              Don&apos;t close automatically
            </button>
          </p>
        ) : (
          <form onSubmit={handleSetCloseTime} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label htmlFor="close-time">Close automatically at</label>
            <input
              id="close-time"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <Button type="submit" variant="outline" size="sm" disabled={!closeTime || toggling}>
              Set
            </Button>
          </form>
        ))}

      {revealAnswers !== null && (
        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={revealAnswers}
            disabled={toggling}
            onChange={(e) => handleRevealChange(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span>
            Show students the correct answers after submissions close
            {revealAnswers && (
              <span className="block text-xs text-slate-500">
                {isOpen
                  ? "Students will see them once you close submissions."
                  : "Students can see them now on their submitted answers."}
              </span>
            )}
          </span>
        </label>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      {!hasAnalysis && (
        <div>
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="w-full sm:w-auto"
          >
            {analyzing ? "Analyzing responses…" : "Run analysis"}
          </Button>
          {!canAnalyze && (
            <p className="text-xs text-slate-500 mt-1.5">
              Requires at least 3 submissions ({submissionCount} so far)
            </p>
          )}
        </div>
      )}

      {hasAnalysis && (
        <div>
          {showRerun ? (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="outline"
              size="sm"
            >
              {analyzing ? "Re-analyzing…" : "Re-run analysis (new responses since last run)"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">Analysis is up to date.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? "Running…" : "Run again"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const noSubscribe = () => () => {};
