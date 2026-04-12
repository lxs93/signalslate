"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option {
  id: string;
  optionText: string;
  orderIndex: number;
}

interface Question {
  id: string;
  prompt: string;
  questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
  orderIndex: number;
  options: Option[];
}

interface TicketData {
  id: string;
  title: string;
  subject: string;
  lessonTopic: string;
  isOpen: boolean;
  questions: Question[];
}

export default function StudentFormPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/public/tickets/${ticketId}/submissions`)
      .then((r) => r.json())
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load this exit ticket.");
        setLoading(false);
      });
  }, [ticketId]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;

    if (!studentName.trim()) {
      setError("Please enter your name");
      return;
    }

    // Validate all questions answered
    for (const q of ticket.questions) {
      if (!answers[q.id]?.trim()) {
        setError(`Please answer question ${q.orderIndex + 1}`);
        return;
      }
    }

    setError("");
    setSubmitting(true);

    const responses = ticket.questions.map((q) => {
      if (q.questionType === "SHORT_ANSWER") {
        return { questionId: q.id, answerText: answers[q.id], selectedOptionId: null };
      }
      return { questionId: q.id, answerText: null, selectedOptionId: answers[q.id] };
    });

    try {
      const res = await fetch(`/api/public/tickets/${ticketId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/s/${ticketId}/thank-you`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!ticket || error === "Failed to load this exit ticket.") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-700 font-medium">Exit ticket not found</p>
          <p className="text-sm text-slate-500 mt-1">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (!ticket.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-slate-700 font-medium text-lg">Submissions are closed</p>
          <p className="text-sm text-slate-500 mt-2">
            This exit ticket is no longer accepting responses. Check with your teacher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
            Exit ticket
          </p>
          <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {ticket.subject} · {ticket.lessonTopic}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="studentName">Your name</Label>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="First name or full name"
              autoComplete="off"
            />
          </div>

          {ticket.questions.map((q, i) => (
            <Card key={q.id} className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.questionType === "SHORT_ANSWER" ? (
                  <Textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Write your answer here…"
                    rows={3}
                  />
                ) : (
                  <RadioGroup
                    value={answers[q.id] ?? ""}
                    onValueChange={(val) => setAnswer(q.id, val)}
                    className="space-y-2"
                  >
                    {q.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2.5">
                        <RadioGroupItem value={opt.id} id={opt.id} />
                        <Label htmlFor={opt.id} className="font-normal cursor-pointer">
                          {opt.optionText}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </div>
    </div>
  );
}
