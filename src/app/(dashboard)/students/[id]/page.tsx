import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteStudentButton } from "@/components/delete-student-button";
import { FlagCheckInButton } from "@/components/flag-check-in-button";
import { isOpenNow } from "@/lib/ticket-status";

const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const student = await db.student
    .findUnique({
      where: { id },
      include: {
        enrollments: { include: { period: true } },
        submissions: {
          orderBy: { submittedAt: "desc" },
          include: {
            exitTicket: {
              select: {
                id: true,
                title: true,
                subject: true,
                questions: {
                  orderBy: { orderIndex: "asc" },
                  include: { options: { select: { id: true, isCorrect: true } } },
                },
              },
            },
            responses: { include: { selectedOption: true } },
          },
        },
        flags: {
          orderBy: { createdAt: "desc" },
          include: { analysis: { select: { exitTicket: { select: { id: true, title: true } } } } },
        },
      },
    })
    .catch(() => null);

  if (!student || student.teacherId !== userId) {
    notFound();
  }

  const fullName = `${student.firstName} ${student.lastName}`.trim();
  const openFlags = student.flags.filter((f) => !f.resolvedAt);
  const checkedInFlags = student.flags.filter((f) => f.resolvedAt);
  const periodIds = student.enrollments.map((e) => e.periodId);
  const submittedIds = student.submissions.map((s) => s.exitTicketId);
  const missing = await db.exitTicket.findMany({
    where: {
      userId,
      periods: { some: { id: { in: periodIds } } },
      id: { notIn: submittedIds },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, isOpen: true, closesAt: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl">
      <Link href="/students" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
        ← Students
      </Link>

      <div className="flex items-start justify-between mt-2 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {student.enrollments.length > 0 ? (
              student.enrollments.map((e, i) => (
                <span key={e.periodId}>
                  {i > 0 && ", "}
                  <Link href={`/periods/${e.periodId}`} className="hover:underline">
                    {e.period.name}
                  </Link>
                </span>
              ))
            ) : (
              "Not in any section"
            )}{" "}
            · PIN <span className="font-mono text-slate-800">{student.pin}</span>
          </p>
        </div>
        <DeleteStudentButton studentId={student.id} name={fullName} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          ["Answered", student.submissions.length],
          ["Not answered", missing.length],
          ["Open flags", openFlags.length],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {student.flags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Check in about
          </h2>
          {openFlags.length === 0 && (
            <p className="text-sm text-slate-500 mb-2">You&apos;ve checked in on every flag.</p>
          )}
          <div className="space-y-2">
            {openFlags.map((f) => (
              <div
                key={f.id}
                className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-start gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{f.reason}</p>
                  <Link
                    href={`/tickets/${f.analysis.exitTicket.id}`}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    {f.analysis.exitTicket.title} · {shortDate(f.createdAt)}
                  </Link>
                </div>
                <FlagCheckInButton flagId={f.id} resolved={false} />
              </div>
            ))}
          </div>
          {checkedInFlags.length > 0 && (
            <details className="mt-3 group">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-800">
                Checked in ({checkedInFlags.length})
              </summary>
              <div className="space-y-2 mt-2">
                {checkedInFlags.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-start gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-600">{f.reason}</p>
                      <Link
                        href={`/tickets/${f.analysis.exitTicket.id}`}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        {f.analysis.exitTicket.title} · checked in {shortDate(f.resolvedAt!)}
                      </Link>
                    </div>
                    <FlagCheckInButton flagId={f.id} resolved />
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {missing.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Not answered
          </h2>
          <div className="space-y-1.5">
            {missing.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <span className="text-sm text-slate-800">{t.title}</span>
                <span className="text-xs text-slate-500">
                  {isOpenNow(t) ? "Open" : "Closed"} · {shortDate(t.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Answers
        </h2>
        {student.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No answers yet.</p>
        ) : (
          <div className="space-y-4">
            {student.submissions.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <CardTitle className="text-base">
                      <Link href={`/tickets/${sub.exitTicket.id}`} className="hover:underline">
                        {sub.exitTicket.title}
                      </Link>
                    </CardTitle>
                    <span className="text-xs text-slate-500 shrink-0">
                      {sub.exitTicket.subject} · {shortDate(sub.submittedAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sub.exitTicket.questions.map((q, i) => {
                    const r = sub.responses.find((x) => x.questionId === q.id);
                    const hasKey = q.options.some((o) => o.isCorrect);
                    const correct = r?.selectedOption ? r.selectedOption.isCorrect === true : null;
                    const answer = r?.selectedOption?.optionText ?? r?.answerText;
                    return (
                      <div key={q.id}>
                        <p className="text-xs font-medium text-slate-500">
                          {i + 1}. {q.prompt}
                        </p>
                        <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">
                          {answer ?? <span className="italic text-slate-400">No answer</span>}
                          {hasKey && correct !== null && (
                            <span
                              className={`ml-2 text-xs font-medium ${correct ? "text-emerald-600" : "text-red-500"}`}
                            >
                              {correct ? "✓ correct" : "✗ incorrect"}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
