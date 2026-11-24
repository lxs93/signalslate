import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnalysisPanel } from "@/components/analysis-panel";
import { TicketActions } from "@/components/ticket-actions";
import { PeriodSelector } from "@/components/period-selector";
import { DeleteTicketButton } from "@/components/delete-ticket-button";
import { ChoiceResults } from "@/components/choice-results";
import { summarizeChoices } from "@/lib/choice-results";
import { ticketStandardsInclude } from "@/lib/tickets";
import { frameworkLabel } from "@/lib/standards";
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
      periods: true,
      standards: ticketStandardsInclude,
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

  const periods = await db.classPeriod.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { createdAt: "asc" },
  });

  // Enrolled students in this ticket's sections who haven't answered yet
  const submittedStudentIds = ticket.submissions
    .map((s: Submission) => s.studentId)
    .filter((x: string | null): x is string => !!x);
  const notSubmitted = await db.student.findMany({
    where: {
      teacherId: session!.user!.id!,
      enrollments: { some: { periodId: { in: ticket.periods.map((p: { id: string }) => p.id) } } },
      id: { notIn: submittedStudentIds },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  // How many students picked each multiple-choice option
  const optionCounts = await db.response.groupBy({
    by: ["selectedOptionId"],
    where: { question: { exitTicketId: ticket.id }, selectedOptionId: { not: null } },
    _count: { _all: true },
  });
  const countByOption = new Map(
    optionCounts.map((r) => [r.selectedOptionId as string, r._count._all])
  );

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
            {ticket.periods.length > 0 && <> · {ticket.periods.map((p) => p.name).join(", ")}</>}
          </p>
          {ticket.standards.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Standards">
              {ticket.standards.map((s) => (
                <li
                  key={s.id}
                  title={s.standard?.description}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5"
                >
                  <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">
                    {s.standard ? frameworkLabel(s.standard.framework) : "Custom"}
                  </span>
                  <span className="font-mono text-xs text-slate-900">{s.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="flex items-center gap-1.5 shrink-0 mt-1 text-sm text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full ${ticket.isOpen ? "bg-emerald-500" : "bg-slate-300"}`} />
          {ticket.isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-slate-500">
          Created {new Date(ticket.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {periods.length > 0 && (
          <PeriodSelector
            ticketId={ticket.id}
            currentPeriodIds={ticket.periods.map((p) => p.id)}
            periods={periods}
          />
        )}
      </div>

      <TicketActions
        ticketId={ticket.id}
        isOpen={ticket.isOpen}
        submissionCount={ticket._count.submissions}
        hasNewSubmissions={hasNewSubmissions}
        hasAnalysis={!!latestAnalysis}
        revealAnswers={
          ticket.questions.some((q) => q.options.some((o) => o.isCorrect)) ? ticket.revealAnswers : null
        }
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
              {q.questionType === "MULTIPLE_CHOICE" && ticket._count.submissions > 0 && (
                <ChoiceResults result={summarizeChoices(q.options, countByOption)} />
              )}
              {q.questionType === "MULTIPLE_CHOICE" && ticket._count.submissions === 0 && (
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
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Responses ({ticket._count.submissions})
          </h2>
          {ticket._count.submissions > 0 && (
            <Link href={`/tickets/${ticket.id}/answers`} className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline">
              Read answers by question →
            </Link>
          )}
        </div>
        {ticket.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No responses yet. Students answer from their SignalSlate home page, or you can share the student link.
          </p>
        ) : (
          <div className="space-y-1.5">
            {ticket.submissions.map((sub: Submission) => (
              <Link
                key={sub.id}
                href={`/tickets/${ticket.id}/submissions/${sub.id}`}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <span className="text-sm font-medium text-slate-900">
                  {sub.studentName}
                  {!sub.studentId && (
                    <span className="ml-2 text-xs font-normal text-slate-400">no account</span>
                  )}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-2">
                  {new Date(sub.submittedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  {new Date(sub.submittedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  <span className="text-slate-300 group-hover:text-slate-500 transition-colors">→</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        {notSubmitted.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Not submitted ({notSubmitted.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {notSubmitted.map((s) => (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className="text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md px-2.5 py-1 transition-colors"
                >
                  {s.firstName} {s.lastName}
                </Link>
              ))}
            </div>
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
          <AnalysisPanel analysis={latestAnalysis} ticketId={ticket.id} />
        </section>
      )}

      {!latestAnalysis && ticket._count.submissions >= 3 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-600 font-medium">Ready to analyze</p>
            <p className="text-xs text-slate-500 mt-1">
              {ticket._count.submissions}{" "}responses collected. Click &quot;Run analysis&quot; above.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />
      <div className="flex justify-end">
        <DeleteTicketButton
          ticketId={ticket.id}
          title={ticket.title}
          submissionCount={ticket._count.submissions}
        />
      </div>
    </div>
  );
}
