import Link from "next/link";
import { db } from "@/lib/db";
import { getStudentId } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudentHomePage() {
  const studentId = (await getStudentId())!;

  const tickets = await db.exitTicket.findMany({
    where: { periods: { some: { enrollments: { some: { studentId } } } } },
    orderBy: { createdAt: "desc" },
    include: {
      periods: {
        where: { enrollments: { some: { studentId } } },
        select: { name: true },
      },
      submissions: { where: { studentId }, select: { submittedAt: true } },
      _count: { select: { questions: true } },
    },
  });

  const todo = tickets.filter((t) => t.isOpen && t.submissions.length === 0);
  const done = tickets.filter((t) => t.submissions.length > 0);
  const missed = tickets.filter((t) => !t.isOpen && t.submissions.length === 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Your exit tickets</h1>
        <p className="text-sm text-slate-500 mt-1">
          {todo.length === 0
            ? "You're all caught up."
            : `${todo.length} to answer`}
        </p>
      </div>

      {todo.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">To do</p>
          <div className="space-y-2.5">
            {todo.map((t) => (
              <Link key={t.id} href={`/s/${t.id}`} className="block">
                <Card className="hover:border-slate-500 transition-colors">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.periods.map((p) => p.name).join(", ")} · {t.subject} ·{" "}
                        {t._count.questions} question{t._count.questions !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-900">Start →</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Submitted</p>
          <div className="space-y-2.5">
            {done.map((t) => (
              <Link key={t.id} href={`/student/tickets/${t.id}`} className="block">
                <Card className="border-slate-200 hover:border-slate-300 transition-colors">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.subject} · Submitted{" "}
                        {t.submissions[0].submittedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">View answers →</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {missed.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Closed</p>
          <div className="space-y-2.5">
            {missed.map((t) => (
              <Card key={t.id} className="bg-slate-50">
                <CardContent className="py-3 px-4">
                  <p className="text-sm text-slate-600">{t.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.subject} · Closed before you answered
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {tickets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 font-medium">No exit tickets yet</p>
            <p className="text-sm text-slate-500 mt-1">
              When your teacher posts one, it will show up here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
