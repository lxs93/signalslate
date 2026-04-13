import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import type { Question, QuestionOption, Response, QuestionType } from "@/generated/prisma/client";

type ResponseWithOption = Response & { selectedOption: QuestionOption | null };
type QuestionWithOptions = Question & { options: QuestionOption[] };

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const session = await auth();

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: {
      exitTicket: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
      responses: {
        include: { selectedOption: true },
      },
    },
  });

  if (!submission || submission.exitTicket.userId !== session!.user!.id || submission.exitTicketId !== id) {
    notFound();
  }

  const responseByQuestion = new Map<string, ResponseWithOption>(
    submission.responses.map((r: ResponseWithOption) => [r.questionId, r])
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-2">
        <Link
          href={`/tickets/${id}`}
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← {submission.exitTicket.title}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{submission.studentName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submitted{" "}
          {new Date(submission.submittedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          at{" "}
          {new Date(submission.submittedAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="space-y-4">
        {submission.exitTicket.questions.map((q: QuestionWithOptions, i: number) => {
          const response = responseByQuestion.get(q.id);
          const isMultipleChoice = q.questionType === ("MULTIPLE_CHOICE" as QuestionType);
          const selectedOption = response?.selectedOption ?? null;
          const isCorrect = selectedOption?.isCorrect ?? null;
          const correctOption = isMultipleChoice
            ? q.options.find((opt: QuestionOption) => opt.isCorrect)
            : null;

          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-lg px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-slate-900">
                  {i + 1}. {q.prompt}
                </p>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {isMultipleChoice ? "Multiple choice" : "Short answer"}
                </Badge>
              </div>

              {!isMultipleChoice && (
                <div className="bg-slate-50 rounded-md px-3 py-2.5">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">
                    {response?.answerText || <span className="text-slate-400 italic">No answer</span>}
                  </p>
                </div>
              )}

              {isMultipleChoice && (
                <div className="space-y-1.5">
                  {selectedOption ? (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        isCorrect
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <span>{isCorrect ? "✓" : "✗"}</span>
                      <span>{selectedOption.optionText}</span>
                      <span className="ml-auto text-xs opacity-60">
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic px-1">No answer</p>
                  )}

                  {!isCorrect && correctOption && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>✓</span>
                      <span>{correctOption.optionText}</span>
                      <span className="ml-auto text-xs opacity-60">Correct answer</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
