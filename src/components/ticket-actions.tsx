"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TicketActionsProps {
  ticketId: string;
  isOpen: boolean;
  submissionCount: number;
  hasNewSubmissions: boolean;
  hasAnalysis: boolean;
}

export function TicketActions({
  ticketId,
  isOpen,
  submissionCount,
  hasNewSubmissions,
  hasAnalysis,
}: TicketActionsProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
            <p className="text-xs text-slate-500">
              Analysis is up to date.{" "}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="underline hover:no-underline"
              >
                {analyzing ? "Running…" : "Run again"}
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
