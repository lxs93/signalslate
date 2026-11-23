"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TicketFormData {
  id: string;
  title: string;
  subject: string;
  lessonTopic: string;
  questions: {
    id: string;
    prompt: string;
    questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
    orderIndex: number;
    options: { id: string; optionText: string; orderIndex: number }[];
  }[];
}

export function ExitTicketForm({ ticket }: { ticket: TicketFormData }) {
  const ticketId = ticket.id;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const res = await fetch(`/api/student/tickets/${ticketId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
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

  return (
    <div className="py-8 px-4">
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
