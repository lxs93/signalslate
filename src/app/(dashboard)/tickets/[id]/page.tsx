import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnalysisPanel } from "@/components/analysis-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { isOpenNow } from "@/lib/ticket-status";
import { confidenceLabel, summarizeConfidence, type ConfidenceSummary } from "@/lib/confidence";
import { TicketActions } from "@/components/ticket-actions";
import { PeriodSelector } from "@/components/period-selector";
import { DeleteTicketButton } from "@/components/delete-ticket-button";
import { ChoiceResults } from "@/components/choice-results";
import { summarizeChoices } from "@/lib/choice-results";
import { ticketStandardsInclude } from "@/lib/tickets";
import { frameworkLabel } from "@/lib/standards";
import { correctByPeriod, type PeriodScore } from "@/lib/period-results";
import type { Question, QuestionOption, Submission } from "@/generated/prisma/client";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period: periodParam } = await searchParams;
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

  // Which of the ticket's periods each enrolled student is in
  const enrollments = await db.enrollment.findMany({
    where: { periodId: { in: ticket.periods.map((p) => p.id) } },
    select: { studentId: true, periodId: true },
  });
  const periodsByStudent = new Map<string, string[]>();
  for (const e of enrollments) {
    periodsByStudent.set(e.studentId, [...(periodsByStudent.get(e.studentId) ?? []), e.periodId]);
  }

  // With two or more periods, ?period= narrows the page to one of them
  const multiPeriod = ticket.periods.length > 1;
  const activePeriod = multiPeriod ? ticket.periods.find((p) => p.id === periodParam) ?? null : null;
  const inActivePeriod = (studentId: string | null) =>
    !activePeriod || (!!studentId && (periodsByStudent.get(studentId) ?? []).includes(activePeriod.id));
  const shownSubmissions = ticket.submissions.filter((s) => inActivePeriod(s.studentId));
  const periodQuery = activePeriod ? `?period=${activePeriod.id}` : "";

  // Enrolled students in this ticket's sections who haven't answered yet
  const submittedStudentIds = ticket.submissions
    .map((s: Submission) => s.studentId)
    .filter((x: string | null): x is string => !!x);
  const notSubmitted = await db.student.findMany({
    where: {
      teacherId: session!.user!.id!,
      enrollments: {
        some: { periodId: { in: activePeriod ? [activePeriod.id] : ticket.periods.map((p: { id: string }) => p.id) } },
      },
      id: { notIn: submittedStudentIds },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  // How many students picked each multiple-choice option
  const optionCounts = await db.response.groupBy({
    by: ["selectedOptionId"],
    where: {
      question: { exitTicketId: ticket.id },
      selectedOptionId: { not: null },
      ...(activePeriod ? { submissionId: { in: shownSubmissions.map((s) => s.id) } } : {}),
    },
    _count: { _all: true },
  });

  // On "All periods", how each period did on each marked multiple-choice question
  const scoresByQuestion = new Map<string, PeriodScore[]>();
  if (multiPeriod && !activePeriod) {
    const marked = await db.response.findMany({
      where: {
        question: { exitTicketId: ticket.id, options: { some: { isCorrect: true } } },
        selectedOptionId: { not: null },
      },
      select: { questionId: true, submission: { select: { studentId: true } }, selectedOption: { select: { isCorrect: true } } },
    });
    for (const q of ticket.questions) {
      const answers = marked
        .filter((r) => r.questionId === q.id)
        .map((r) => ({ studentId: r.submission.studentId, isCorrect: !!r.selectedOption?.isCorrect }));
      if (answers.length) scoresByQuestion.set(q.id, correctByPeriod(answers, periodsByStudent, ticket.periods));
    }
  }
  const countByOption = new Map(
    optionCounts.map((r) => [r.selectedOptionId as string, r._count._all])
  );

  // How sure students were, against how they did on marked multiple-choice questions
  let confidence: ConfidenceSummary | null = null;
  if (ticket.askConfidence && shownSubmissions.length > 0) {
    const markedAnswers = await db.response.findMany({
      where: {
        submissionId: { in: shownSubmissions.map((s) => s.id) },
        question: { options: { some: { isCorrect: true } } },
      },
      select: { submissionId: true, selectedOption: { select: { isCorrect: true } } },
    });
    confidence = summarizeConfidence(
      shownSubmissions.map((s) => {
        const mine = markedAnswers.filter((r) => r.submissionId === s.id);
        return {
          submissionId: s.id,
          studentName: s.studentName,
          confidence: s.confidence,
          marked: mine.length,
          wrong: mine.filter((r) => !r.selectedOption?.isCorrect).length,
        };
      })
    );
  }

  const openNow = isOpenNow(ticket);
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
          <span className={`w-1.5 h-1.5 rounded-full ${openNow ? "bg-emerald-500" : "bg-slate-300"}`} />
          {openNow ? "Open" : "Closed"}
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

      {multiPeriod && (
        <nav aria-label="Period" className="mb-4 flex flex-wrap items-center gap-1.5">
          {[{ id: "", name: "All periods" }, ...ticket.periods].map((p) => {
            const current = (activePeriod?.id ?? "") === p.id;
            return (
              <Link
                key={p.id || "all"}
                href={p.id ? `/tickets/${ticket.id}?period=${p.id}` : `/tickets/${ticket.id}`}
                aria-current={current ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  current ? "bg-slate-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.name}
              </Link>
            );
          })}
        </nav>
      )}
      {(openNow || notSubmitted.length > 0) && ticket.periods.length > 0 && (
        <SubmissionProgress
          submitted={shownSubmissions.length}
          expected={shownSubmissions.length + notSubmitted.length}
          live={openNow}
        />
      )}
      {openNow && <LiveRefresh />}

      <TicketActions
        ticketId={ticket.id}
        isOpen={openNow}
        closesAt={openNow && ticket.closesAt ? ticket.closesAt.toISOString() : null}
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
                <>
                  <ChoiceResults result={summarizeChoices(q.options, countByOption)} />
                  {scoresByQuestion.has(q.id) && <PeriodScores scores={scoresByQuestion.get(q.id)!} />}
                </>
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

      {confidence && confidence.answered > 0 && (
        <ConfidencePanel summary={confidence} ticketId={ticket.id} />
      )}

      {/* Submissions */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Responses ({shownSubmissions.length})
          </h2>
          {shownSubmissions.length > 0 && (
            <Link href={`/tickets/${ticket.id}/answers${periodQuery}`} className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline">
              Read answers by question →
            </Link>
          )}
        </div>
        {shownSubmissions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No responses yet. Students answer from their SignalSlate home page, or you can share the student link.
          </p>
        ) : (
          <div className="space-y-1.5">
            {shownSubmissions.map((sub: Submission) => (
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
                  {sub.feedback && <span className="mr-2 text-sky-700">Note sent</span>}
                  {confidenceLabel(sub.confidence) && (
                    <span className="mr-2 text-slate-400">{confidenceLabel(sub.confidence)}</span>
                  )}
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

/** "8 of 12 students in", with a bar. */
function SubmissionProgress({ submitted, expected, live }: { submitted: number; expected: number; live: boolean }) {
  const percent = expected ? Math.min(100, Math.round((submitted / expected) * 100)) : 0;
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-slate-900" aria-live="polite">
          <span className="text-lg font-semibold tabular-nums">{submitted}</span>
          <span className="text-slate-500"> of {expected} students in</span>
        </p>
        {live && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Updating live
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** "Period 2 · 82%   Period 5 · 45%" under a multiple-choice question. */
function PeriodScores({ scores }: { scores: PeriodScore[] }) {
  const answered = scores.filter((s) => s.percent !== null);
  if (answered.length < 2) return null;
  const low = Math.min(...answered.map((s) => s.percent!));
  const high = Math.max(...answered.map((s) => s.percent!));
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
      <span className="font-medium text-slate-600">By period:</span>
      {answered.map((s) => (
        <span key={s.periodId}>
          {s.name}{" "}
          <span
            className={`font-semibold tabular-nums ${
              high - low >= 20 && s.percent === low ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {s.percent}%
          </span>{" "}
          <span className="tabular-nums">
            ({s.correct} of {s.total})
          </span>
        </span>
      ))}
    </p>
  );
}

/** How sure students said they were, and who was sure but missed a marked question. */
function ConfidencePanel({ summary, ticketId }: { summary: ConfidenceSummary; ticketId: string }) {
  const max = Math.max(...summary.counts.map((c) => c.count), 1);
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">How sure students were</h2>
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-4">
        <ul className="grid grid-cols-4 gap-3">
          {summary.counts.map((c) => (
            <li key={c.value} className="text-center">
              <div className="flex h-14 items-end justify-center" aria-hidden="true">
                <div
                  className={`w-8 rounded-t ${c.value >= 3 ? "bg-slate-500" : "bg-slate-300"}`}
                  style={{ height: `${Math.max(4, (c.count / max) * 56)}px` }}
                />
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{c.count}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </li>
          ))}
        </ul>
        {summary.confidentButWrong.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-sm font-medium text-amber-700">Confident but wrong</p>
            <p className="text-xs text-slate-500 mb-2">
              Sure of their answers but missed a marked question. A misconception they hold firmly is worth a word.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {summary.confidentButWrong.map((r) => (
                <li key={r.submissionId}>
                  <Link
                    href={`/tickets/${ticketId}/submissions/${r.submissionId}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
                  >
                    {r.studentName}
                    <span className="text-amber-700">
                      · {confidenceLabel(r.confidence)}, missed {r.wrong} of {r.marked}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
