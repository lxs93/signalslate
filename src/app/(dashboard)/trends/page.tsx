import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ClassPeriod } from "@/generated/prisma/client";
import { ticketStandardsInclude } from "@/lib/tickets";
import { frameworkLabel } from "@/lib/standards";
import { summarizeStandardTrends } from "@/lib/standard-trends";

type ThemeRow = { themeName: string; themeType: string; _count: { themeName: number } };
type FlagRow = {
  studentId: string | null;
  studentName: string;
  reason: string;
  analysis: { exitTicket: { id: string; title: string } };
};

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { period: selectedPeriodId } = await searchParams;

  const periods = await db.classPeriod.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const ticketFilter = {
    userId,
    ...(selectedPeriodId ? { periods: { some: { id: selectedPeriodId } } } : {}),
  };

  const [themes, flags, taggedTickets] = await Promise.all([
    db.analysisTheme.groupBy({
      by: ["themeName", "themeType"],
      _count: { themeName: true },
      where: { analysis: { exitTicket: ticketFilter } },
      orderBy: { _count: { themeName: "desc" } },
      take: 20,
    }),
    db.followUpFlag.findMany({
      where: { analysis: { exitTicket: ticketFilter } },
      include: {
        analysis: {
          include: {
            exitTicket: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.exitTicket.findMany({
      where: { ...ticketFilter, standards: { some: {} }, submissions: { some: {} } },
      select: {
        id: true,
        title: true,
        standards: ticketStandardsInclude,
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            themes: { select: { themeName: true } },
            _count: { select: { followUpFlags: { where: { resolvedAt: null } } } },
          },
        },
      },
    }),
  ]);

  // Answers to multiple-choice questions with a marked correct choice, per ticket
  const markedAnswers = await db.response.findMany({
    where: {
      question: { exitTicketId: { in: taggedTickets.map((t) => t.id) }, options: { some: { isCorrect: true } } },
      selectedOptionId: { not: null },
    },
    select: { question: { select: { exitTicketId: true } }, selectedOption: { select: { isCorrect: true } } },
  });
  const marks = new Map<string, { correct: number; marked: number }>();
  for (const r of markedAnswers) {
    const m = marks.get(r.question.exitTicketId) ?? { correct: 0, marked: 0 };
    m.marked += 1;
    if (r.selectedOption?.isCorrect) m.correct += 1;
    marks.set(r.question.exitTicketId, m);
  }
  const standardTrends = summarizeStandardTrends(
    taggedTickets.map((t) => ({
      id: t.id,
      title: t.title,
      standards: t.standards.map((s) => ({
        standardId: s.standardId,
        code: s.code,
        framework: s.standard?.framework ?? null,
        description: s.standard?.description ?? null,
      })),
      ...(marks.get(t.id) ?? { correct: 0, marked: 0 }),
      themes: t.analyses[0]?.themes.map((th) => th.themeName) ?? [],
      openFlags: t.analyses[0]?._count.followUpFlags ?? 0,
    }))
  );

  // Group flags by student account, falling back to the name for flags
  // that couldn't be linked to an account
  type FlagInstance = { reason: string; ticketTitle: string; ticketId: string };
  type FlagEntry = { studentId: string | null; studentName: string; count: number; flags: FlagInstance[] };
  const byStudent = new Map<string, FlagEntry>();
  for (const flag of flags as FlagRow[]) {
    const key = flag.studentId ?? `name:${flag.studentName}`;
    const entry =
      byStudent.get(key) ??
      { studentId: flag.studentId, studentName: flag.studentName, count: 0, flags: [] };
    entry.count += 1;
    entry.flags.push({
      reason: flag.reason,
      ticketTitle: flag.analysis.exitTicket.title,
      ticketId: flag.analysis.exitTicket.id,
    });
    byStudent.set(key, entry);
  }
  const sortedStudents: FlagEntry[] = [...byStudent.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const selectedPeriod = periods.find((p: ClassPeriod) => p.id === selectedPeriodId);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Trends</h1>
        <p className="text-sm text-slate-500 mt-1">
          Recurring misconceptions and follow-up patterns across your exit tickets
        </p>
      </div>

      {periods.length > 0 && (
        <div className="flex items-center gap-1.5 mb-8 flex-wrap">
          <Link
            href="/trends"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedPeriodId
                ? "bg-slate-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All
          </Link>
          {periods.map((period: ClassPeriod) => (
            <Link
              key={period.id}
              href={`/trends?period=${period.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedPeriodId === period.id
                  ? "bg-slate-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {period.name}
            </Link>
          ))}
        </div>
      )}

      {themes.length === 0 && flags.length === 0 && standardTrends.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-600 font-medium">No trends yet</p>
            <p className="text-xs text-slate-500 mt-1">
              {selectedPeriod
                ? `No analyzed tickets in ${selectedPeriod.name} yet.`
                : "Run analysis on at least one exit ticket to start seeing patterns here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Standards, weakest first */}
          {standardTrends.length > 0 && (
            <>
              <section>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  By Standard
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Standards on your answered tickets. Lowest share correct on marked multiple-choice questions first.
                </p>
                <div className="space-y-2">
                  {standardTrends.map((row) => (
                    <div key={row.key} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500 mr-1.5">
                              {row.framework ? frameworkLabel(row.framework) : "Custom"}
                            </span>
                            <span className="font-mono text-xs font-medium text-slate-900">{row.code}</span>
                          </p>
                          {row.description && (
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{row.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {row.percentCorrect !== null ? (
                            <p className="text-sm font-semibold text-slate-900">
                              {row.percentCorrect}% <span className="font-normal text-slate-500">correct</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">No marked questions</p>
                          )}
                          {row.openFlags > 0 && (
                            <p className="text-xs text-amber-700 mt-0.5">
                              {row.openFlags} to check in with
                            </p>
                          )}
                        </div>
                      </div>
                      {row.percentCorrect !== null && (
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                          <div
                            className={`h-1.5 rounded-full ${row.percentCorrect < 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                            style={{ width: `${row.percentCorrect}%` }}
                          />
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>
                          {row.tickets.map((t, i) => (
                            <span key={t.id}>
                              {i > 0 && ", "}
                              <a href={`/tickets/${t.id}`} className="text-slate-700 hover:underline">
                                {t.title}
                              </a>
                            </span>
                          ))}
                        </span>
                        {row.topThemes.map((theme) => (
                          <Badge key={theme} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Separator />
            </>
          )}

          {/* Recurring misconception themes */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Recurring Misconception Themes
            </h2>
            {themes.length === 0 ? (
              <p className="text-sm text-slate-500">No theme data yet.</p>
            ) : (
              <div className="space-y-2">
                {(themes as ThemeRow[]).map((theme: ThemeRow, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-900">{theme.themeName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {theme._count.themeName}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Repeatedly flagged students */}
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Students Flagged Multiple Times
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Based on follow-up flags across all analyzed tickets. These are patterns to inform
              check-ins, not assessments.
            </p>
            {sortedStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No repeated flags yet.</p>
            ) : (
              <div className="space-y-3">
                {sortedStudents.map((entry) => (
                  <Card key={entry.studentId ?? entry.studentName} className="border-slate-200">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          {entry.studentId ? (
                            <a href={`/students/${entry.studentId}`} className="hover:underline">
                              {entry.studentName}
                            </a>
                          ) : (
                            entry.studentName
                          )}
                        </CardTitle>
                        <Badge variant={entry.count > 2 ? "default" : "secondary"} className="text-xs">
                          {entry.count} ticket{entry.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-1.5">
                        {entry.flags.slice(0, 3).map((inst, j) => (
                          <div key={j} className="text-xs text-slate-600">
                            <a
                              href={`/tickets/${inst.ticketId}`}
                              className="font-medium text-slate-700 hover:underline"
                            >
                              {inst.ticketTitle}
                            </a>
                            {" — "}
                            {inst.reason}
                          </div>
                        ))}
                        {entry.count > 3 && (
                          <p className="text-xs text-slate-400">
                            +{entry.count - 3} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
