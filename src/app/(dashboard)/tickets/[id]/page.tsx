import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnalysisPanel } from "@/components/analysis-panel";
import { TicketActions } from "@/components/ticket-actions";
import type { Question, QuestionOption, Submission } from "@/generated/prisma/client";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const ticket = await db.exitTicket.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
      },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          themes: true,
          followUpFlags: true,
        },
      },
      _count: { select: { submissions: true } },
    },
  });

  if (!ticket || ticket.userId !== session!.user!.id) {
    notFound();
  }

  const latestAnalysis = ticket.analyses[0] ?? null;
  const latestSubmission = ticket.submissions[0] ?? null;
  const hasNewSubmissions =
    latestAnalysis && latestSubmission
      ? new Date(latestSubmission.submittedAt) > new Date(latestAnalysis.createdAt)
      : false;

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <a href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Exit Tickets
        </a>
      </div>

      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{ticket.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {ticket.subject} · {ticket.lessonTopic}
          </p>
        </div>
        <Badge variant={ticket.isOpen ? "default" : "secondary"} className="shrink-0 mt-1">
          {ticket.isOpen ? "Open" : "Closed"}
        </Badge>
      </div>

      <p className="text-xs text-slate-500 mb-6">
        Created {new Date(ticket.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <TicketActions
        ticketId={ticket.id}
        isOpen={ticket.isOpen}
        submissionCount={ticket._count.submissions}
        hasNewSubmissions={hasNewSubmissions}
        hasAnalysis={!!latestAnalysis}
      />

      <Separator className="my-8" />

      {/* Questions */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Questions ({ticket.questions.length})
        </h2>
        <div className="space-y-2">
          {ticket.questions.map((q: Question & { options: QuestionOption[] }, i: number) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {i + 1}. {q.prompt}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {q.questionType === "SHORT_ANSWER" ? "Short answer" : "Multiple choice"}
              </p>
              {q.questionType === "MULTIPLE_CHOICE" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.options.map((opt: QuestionOption) => (
                    <span
                      key={opt.id}
                      className={`text-xs px-2 py-0.5 rounded border ${
                        opt.isCorrect
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {opt.optionText}
                      {opt.isCorrect && " ✓"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Submissions */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Responses ({ticket._count.submissions})
        </h2>
        {ticket.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No responses yet. Share the student link to collect responses.
          </p>
        ) : (
          <div className="space-y-1.5">
            {ticket.submissions.map((sub: Submission) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-slate-900">{sub.studentName}</span>
                <span className="text-xs text-slate-500">
                  {new Date(sub.submittedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {new Date(sub.submittedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Analysis */}
      {latestAnalysis && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Analysis
            </h2>
            <span className="text-xs text-slate-400">
              {new Date(latestAnalysis.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          <AnalysisPanel analysis={latestAnalysis} />
        </section>
      )}

      {!latestAnalysis && ticket._count.submissions >= 3 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-600 font-medium">Ready to analyze</p>
            <p className="text-xs text-slate-500 mt-1">
              {ticket._count.submissions} responses collected. Click &quot;Run analysis&quot; above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
