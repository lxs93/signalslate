"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionBuilder, type QuestionDraft } from "@/components/question-builder";
import { StandardsPicker } from "@/components/standards-picker";
import type { StandardTag } from "@/lib/standards";
import { MAX_TICKET_STANDARDS } from "@/lib/validations";

type Period = { id: string; name: string };
type Step = "details" | "questions";

export interface TicketDraft {
  title: string;
  subject: string;
  lessonTopic: string;
  standards: StandardTag[];
  askConfidence: boolean;
  periodIds: string[];
  questions: QuestionDraft[];
}

interface TicketEditorProps {
  periods: Period[];
  initial?: TicketDraft;
  /** Set when editing an existing ticket. */
  ticketId?: string;
  /** Questions can't change once students have answered. */
  questionsLocked?: boolean;
  heading: string;
}

export function validateQuestions(questions: QuestionDraft[]): string | null {
  if (questions.length < 2) return "Add at least 2 questions";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt`;
    if (q.questionType === "MULTIPLE_CHOICE") {
      if (q.options.length < 2) return `Question ${i + 1} needs at least 2 options`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].optionText.trim()) {
          return `Question ${i + 1}, option ${j + 1} is empty`;
        }
      }
    }
  }
  return null;
}

export function TicketEditor({
  periods,
  initial,
  ticketId,
  questionsLocked = false,
  heading,
}: TicketEditorProps) {
  const router = useRouter();
  const isEdit = !!ticketId;
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [lessonTopic, setLessonTopic] = useState(initial?.lessonTopic ?? "");
  const [standards, setStandards] = useState<StandardTag[]>(initial?.standards ?? []);
  const [askConfidence, setAskConfidence] = useState(initial?.askConfidence ?? true);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>(initial?.periodIds ?? []);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial?.questions ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const backHref = isEdit ? `/tickets/${ticketId}` : "/dashboard";

  async function save(includeQuestions: boolean) {
    setError("");
    setLoading(true);
    const body = {
      title,
      subject,
      lessonTopic,
      standards: standards.map(({ standardId, code }) => ({ standardId, code })),
      askConfidence,
      periodIds: selectedPeriodIds,
      ...(includeQuestions ? { questions } : {}),
    };

    try {
      const res = await fetch(isEdit ? `/api/tickets/${ticketId}` : "/api/tickets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save ticket");
        setLoading(false);
        return;
      }

      const id = isEdit ? ticketId : (await res.json()).id;
      router.push(`/tickets/${id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !lessonTopic.trim()) {
      setError("Required fields are missing");
      return;
    }
    setError("");
    if (questionsLocked) {
      save(false);
    } else {
      setStep("questions");
    }
  }

  function handleSaveQuestions() {
    const validationError = validateQuestions(questions);
    if (validationError) {
      setError(validationError);
      return;
    }
    save(true);
  }

  const stepCount = questionsLocked ? 1 : 2;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (step === "questions" ? setStep("details") : router.push(backHref))}
          className="mb-4 -ml-2"
        >
          ← Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
        {stepCount === 2 && (
          <div className="flex items-center gap-2 mt-3">
            <div className={`h-1.5 w-16 rounded-full ${step === "details" ? "bg-slate-900" : "bg-emerald-500"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step === "questions" ? "bg-slate-900" : "bg-slate-200"}`} />
            <span className="text-xs text-slate-500 ml-1">
              {step === "details" ? "Step 1 of 2 — Details" : "Step 2 of 2 — Questions"}
            </span>
          </div>
        )}
        {questionsLocked && (
          <p className="text-sm text-slate-500 mt-3">
            Students have already answered this ticket, so its questions can&apos;t be changed.
            To change the questions, duplicate the ticket instead.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">{error}</p>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fractions Exit Check"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Math"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Lesson topic</Label>
                <Input
                  id="topic"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder="e.g. Adding unlike denominators"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="standards">
                  Standards <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <StandardsPicker value={standards} onChange={setStandards} max={MAX_TICKET_STANDARDS} />
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={askConfidence}
                  onChange={(e) => setAskConfidence(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>
                  Ask students how sure they are
                  <span className="block text-xs text-slate-500">
                    One question at the end, from &ldquo;Not sure&rdquo; to &ldquo;Very sure&rdquo;. Shows who was
                    confident but wrong.
                  </span>
                </span>
              </label>
              {periods.length > 0 && (
                <div className="space-y-1.5">
                  <Label>
                    Section <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <div className="space-y-1.5">
                    {periods.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPeriodIds.includes(p.id)}
                          onChange={(e) =>
                            setSelectedPeriodIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                            )
                          }
                          className="rounded"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {questionsLocked ? (loading ? "Saving…" : "Save changes") : "Continue to questions"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "questions" && (
        <div className="space-y-4">
          <Card className="border-0 bg-slate-50 px-0">
            <CardContent className="px-4 py-3">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-700">{title}</strong> · {subject} · {lessonTopic}
                {standards.length > 0 && (
                  <> · <span className="font-mono">{standards.map((s) => s.code).join(", ")}</span></>
                )}
                {selectedPeriodIds.length > 0 && (
                  <> · {periods.filter((p) => selectedPeriodIds.includes(p.id)).map((p) => p.name).join(", ")}</>
                )}
              </p>
            </CardContent>
          </Card>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <Button
            onClick={handleSaveQuestions}
            disabled={loading || questions.length < 2}
            className="w-full mt-4"
          >
            {loading
              ? isEdit ? "Saving…" : "Creating…"
              : isEdit ? "Save changes" : "Create exit ticket"}
          </Button>
          {questions.length < 2 && (
            <p className="text-xs text-slate-500 text-center">Add at least 2 questions to continue</p>
          )}
        </div>
      )}
    </div>
  );
}
