"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface QuestionDraft {
  prompt: string;
  questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
  orderIndex: number;
  options: OptionDraft[];
}

interface OptionDraft {
  optionText: string;
  orderIndex: number;
  isCorrect: boolean | null;
}

interface QuestionBuilderProps {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  function addQuestion() {
    if (questions.length >= 4) return;
    onChange([
      ...questions,
      {
        prompt: "",
        questionType: "SHORT_ANSWER",
        orderIndex: questions.length,
        options: [],
      },
    ]);
  }

  function removeQuestion(index: number) {
    const updated = questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, orderIndex: i }));
    onChange(updated);
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    const updated = questions.map((q, i) => {
      if (i !== index) return q;
      const merged = { ...q, ...patch };
      // Reset options when switching away from multiple choice
      if (patch.questionType === "SHORT_ANSWER") merged.options = [];
      // Add two default options when switching to multiple choice
      if (patch.questionType === "MULTIPLE_CHOICE" && merged.options.length === 0) {
        merged.options = [
          { optionText: "", orderIndex: 0, isCorrect: null },
          { optionText: "", orderIndex: 1, isCorrect: null },
        ];
      }
      return merged;
    });
    onChange(updated);
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated.map((q, i) => ({ ...q, orderIndex: i })));
  }

  function addOption(qIndex: number) {
    const q = questions[qIndex];
    if (q.options.length >= 6) return;
    updateQuestion(qIndex, {
      options: [
        ...q.options,
        { optionText: "", orderIndex: q.options.length, isCorrect: null },
      ],
    });
  }

  function removeOption(qIndex: number, oIndex: number) {
    const q = questions[qIndex];
    const updated = q.options
      .filter((_, i) => i !== oIndex)
      .map((o, i) => ({ ...o, orderIndex: i }));
    updateQuestion(qIndex, { options: updated });
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<OptionDraft>) {
    const q = questions[qIndex];
    const updated = q.options.map((o, i) => {
      if (i !== oIndex) return o;
      return { ...o, ...patch };
    });
    updateQuestion(qIndex, { options: updated });
  }

  function toggleCorrect(qIndex: number, oIndex: number) {
    const q = questions[qIndex];
    const isAlreadyCorrect = q.options[oIndex].isCorrect === true;
    // Only one correct answer allowed; clear others when setting
    const updated = q.options.map((o, i) => ({
      ...o,
      isCorrect: i === oIndex ? (isAlreadyCorrect ? null : true) : null,
    }));
    updateQuestion(qIndex, { options: updated });
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIndex) => (
        <Card key={qIndex} className="border-slate-200">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Question {qIndex + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(qIndex, -1)}
                  disabled={qIndex === 0}
                  className="px-1.5 py-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(qIndex, 1)}
                  disabled={qIndex === questions.length - 1}
                  className="px-1.5 py-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="px-1.5 py-1 rounded text-slate-400 hover:text-red-500 text-xs ml-1"
                  title="Remove question"
                >
                  ✕
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Question prompt</Label>
              <Input
                value={q.prompt}
                onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                placeholder="What did you learn today?"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["SHORT_ANSWER", "MULTIPLE_CHOICE"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateQuestion(qIndex, { questionType: type })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      q.questionType === type
                        ? "bg-slate-600 text-white border-slate-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {type === "SHORT_ANSWER" ? "Short answer" : "Multiple choice"}
                  </button>
                ))}
              </div>
            </div>

            {q.questionType === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <Label>Answer options</Label>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <Input
                      value={opt.optionText}
                      onChange={(e) =>
                        updateOption(qIndex, oIndex, { optionText: e.target.value })
                      }
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => toggleCorrect(qIndex, oIndex)}
                      title={opt.isCorrect ? "Marked as correct — click to unmark" : "Mark as correct answer"}
                      className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                        opt.isCorrect
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {opt.isCorrect ? "Correct" : "Correct?"}
                    </button>
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="text-slate-400 hover:text-red-500 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    + Add option
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {questions.length < 4 && (
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          className="w-full border-dashed"
        >
          + Add question {questions.length > 0 ? `(${questions.length}/4)` : ""}
        </Button>
      )}

      {questions.length === 4 && (
        <Badge variant="secondary" className="w-full justify-center py-1.5">
          Maximum 4 questions reached
        </Badge>
      )}
    </div>
  );
}
