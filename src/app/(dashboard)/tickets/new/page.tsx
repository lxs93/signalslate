"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionBuilder, type QuestionDraft } from "@/components/question-builder";

type Step = "details" | "questions";

export default function NewTicketPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !lessonTopic.trim()) {
      setError("All fields are required");
      return;
    }
    setError("");
    setStep("questions");
  }

  function validateQuestions(): string | null {
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

  async function handleCreate() {
    const validationError = validateQuestions();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, lessonTopic, questions }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create ticket");
        setLoading(false);
        return;
      }

      const ticket = await res.json();
      router.push(`/tickets/${ticket.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => (step === "questions" ? setStep("details") : router.push("/dashboard"))}
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4 block"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New exit ticket</h1>
        <div className="flex items-center gap-2 mt-3">
          <div className={`h-1.5 w-16 rounded-full ${step === "details" ? "bg-slate-900" : "bg-emerald-500"}`} />
          <div className={`h-1.5 w-16 rounded-full ${step === "questions" ? "bg-slate-900" : "bg-slate-200"}`} />
          <span className="text-xs text-slate-500 ml-1">
            {step === "details" ? "Step 1 of 2 — Details" : "Step 2 of 2 — Questions"}
          </span>
        </div>
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
              <Button type="submit" className="w-full mt-2">
                Continue to questions
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
              </p>
            </CardContent>
          </Card>

          <QuestionBuilder questions={questions} onChange={setQuestions} />

          <Button
            onClick={handleCreate}
            disabled={loading || questions.length < 2}
            className="w-full mt-4"
          >
            {loading ? "Creating…" : "Create exit ticket"}
          </Button>
          {questions.length < 2 && (
            <p className="text-xs text-slate-500 text-center">Add at least 2 questions to continue</p>
          )}
        </div>
      )}
    </div>
  );
}
