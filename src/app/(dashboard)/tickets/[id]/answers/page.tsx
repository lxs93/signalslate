import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupAnswers, type AnswerRow } from "@/lib/answers-by-question";

/** Every answer to a ticket, read one question at a time. */
export default async function AnswersByQuestionPage({ params }: { params: Promise<{ id: string }> }) {
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
        select: {
          id: true,
          studentId: true,
          studentName: true,
          responses: { select: { questionId: true, answerText: true, selectedOptionId: true } },
        },
      },
    },
  });
  if (!ticket || ticket.userId !== session!.user!.id) notFound();

  const rowsFor = (questionId: string): AnswerRow[] =>
    ticket.submissions.map((s) => {
      const r = s.responses.find((x) => x.questionId === questionId);
      return {
        submissionId: s.id,
        studentId: s.studentId,
        studentName: s.studentName,
        answerText: r?.answerText ?? null,
        selectedOptionId: r?.selectedOptionId ?? null,
      };
    });

  const studentLink = (a: AnswerRow) => `/tickets/${ticket.id}/submissions/${a.submissionId}`;

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <Link href={`/tickets/${ticket.id}`} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← {ticket.title}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Answers by question</h1>
      <p className="text-sm text-slate-500 mt-0.5 mb-8">
        {ticket.submissions.length} {ticket.submissions.length === 1 ? "student" : "students"} answered. Click a name to
        see everything that student sent.
      </p>

      {ticket.submissions.length === 0 ? (
        <p className="text-sm text-slate-500">No responses yet.</p>
      ) : (
        <div className="space-y-10">
          {ticket.questions.map((q, i) => {
            const grouped = groupAnswers(q, rowsFor(q.id));
            const wrongMax =
              grouped.kind === "choice" && grouped.groups.some((g) => g.isCorrect)
                ? Math.max(0, ...grouped.groups.filter((g) => !g.isCorrect).map((g) => g.answers.length))
                : 0;
            return (
              <section key={q.id} aria-labelledby={`q-${q.id}`}>
                <h2 id={`q-${q.id}`} className="text-base font-semibold text-slate-900">
                  {i + 1}. {q.prompt}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  {q.questionType === "SHORT_ANSWER" ? "Short answer" : "Multiple choice"}
                </p>

                {grouped.kind === "short" ? (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    {grouped.answers.map((a) => (
                      <li key={a.submissionId} className="px-4 py-3 sm:flex sm:gap-4">
                        <Link
                          href={studentLink(a)}
                          className="block shrink-0 text-sm font-medium text-slate-900 hover:underline sm:w-40"
                        >
                          {a.studentName}
                        </Link>
                        <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap sm:mt-0">{a.answerText}</p>
                      </li>
                    ))}
                    {grouped.answers.length === 0 && (
                      <li className="px-4 py-3 text-sm text-slate-500">No written answers.</li>
                    )}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {grouped.groups.map((g) => {
                      const topWrong = !g.isCorrect && wrongMax > 0 && g.answers.length === wrongMax;
                      return (
                        <li
                          key={g.optionId}
                          className={`rounded-lg border bg-white px-4 py-3 ${
                            g.isCorrect ? "border-emerald-200" : topWrong ? "border-amber-200" : "border-slate-200"
                          }`}
                        >
                          <p className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={g.isCorrect ? "font-medium text-emerald-700" : "font-medium text-slate-900"}>
                              {g.optionText}
                              {g.isCorrect && " ✓"}
                              {topWrong && <span className="ml-2 text-xs font-normal text-amber-700">most common wrong answer</span>}
                            </span>
                            <span className="text-xs text-slate-500 tabular-nums">
                              {g.answers.length} {g.answers.length === 1 ? "student" : "students"}
                            </span>
                          </p>
                          {g.answers.length > 0 && (
                            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                              {g.answers.map((a) => (
                                <Link key={a.submissionId} href={studentLink(a)} className="text-slate-700 hover:underline">
                                  {a.studentName}
                                </Link>
                              ))}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {grouped.blank.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Left blank:{" "}
                    {grouped.blank.map((a, j) => (
                      <span key={a.submissionId}>
                        {j > 0 && ", "}
                        <Link href={studentLink(a)} className="hover:underline">
                          {a.studentName}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
