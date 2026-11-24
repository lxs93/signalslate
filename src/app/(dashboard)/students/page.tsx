import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; flags?: string }>;
}) {
  const { period: periodFilter, flags } = await searchParams;
  const needsCheckIn = flags === "open";
  const openFlag = { resolvedAt: null };
  const href = (period: string | undefined, open: boolean) => {
    const q = new URLSearchParams();
    if (period) q.set("period", period);
    if (open) q.set("flags", "open");
    const qs = q.toString();
    return qs ? `/students?${qs}` : "/students";
  };
  const session = await auth();
  const userId = session!.user!.id!;

  const [periods, students] = await Promise.all([
    db.classPeriod.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.student.findMany({
      where: {
        teacherId: userId,
        ...(periodFilter ? { enrollments: { some: { periodId: periodFilter } } } : {}),
        ...(needsCheckIn ? { flags: { some: openFlag } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        enrollments: { include: { period: { select: { name: true } } } },
        submissions: { select: { submittedAt: true }, orderBy: { submittedAt: "desc" } },
        _count: { select: { flags: { where: openFlag } } },
      },
    }),
  ]);

  const tab = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add students from a section page. Click a student to see everything they&apos;ve answered.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {periods.length > 1 && (
          <>
            <Link href={href(undefined, needsCheckIn)} className={tab(!periodFilter)}>
              All
            </Link>
            {periods.map((p) => (
              <Link key={p.id} href={href(p.id, needsCheckIn)} className={tab(periodFilter === p.id)}>
                {p.name}
              </Link>
            ))}
            <span className="w-px h-5 bg-slate-200 mx-1" />
          </>
        )}
        <Link href={href(periodFilter, !needsCheckIn)} className={tab(needsCheckIn)}>
          Needs check-in
        </Link>
      </div>

      {students.length === 0 && needsCheckIn ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 font-medium">No open flags</p>
            <p className="text-sm text-slate-500 mt-1">
              You&apos;ve checked in with every flagged student{periodFilter ? " in this section" : ""}.
            </p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 font-medium">No students yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Open a section from{" "}
              <Link href="/dashboard" className="underline">
                Exit Tickets
              </Link>{" "}
              and add your class list.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
          <div className="hidden md:grid grid-cols-[1fr_1fr_90px_90px_110px] gap-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Name</span>
            <span>Sections</span>
            <span className="text-right">Answered</span>
            <span className="text-right">Open flags</span>
            <span className="text-right">Last answer</span>
          </div>
          {students.map((s) => {
            const sections = s.enrollments.map((e) => e.period.name).join(", ") || "—";
            const last = s.submissions[0]
              ? s.submissions[0].submittedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            return (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="block md:grid md:grid-cols-[1fr_1fr_90px_90px_110px] md:gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
              >
                <span className="block font-medium text-slate-900">
                  {s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName}
                </span>
                {/* Phones: one summary line */}
                <span className="block md:hidden text-xs text-slate-500 mt-0.5">
                  {sections} · {s.submissions.length} answered
                  {s._count.flags > 0 && (
                    <span className="text-amber-600 font-medium">
                      {" "}· {s._count.flags} open flag{s._count.flags !== 1 ? "s" : ""}
                    </span>
                  )}
                </span>
                <span className="hidden md:block text-slate-500 truncate">{sections}</span>
                <span className="hidden md:block text-right text-slate-700">{s.submissions.length}</span>
                <span
                  className={`hidden md:block text-right ${s._count.flags > 0 ? "text-amber-600 font-medium" : "text-slate-400"}`}
                >
                  {s._count.flags}
                </span>
                <span className="hidden md:block text-right text-slate-500">{last}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
