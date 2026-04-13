import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ClassPeriod } from "@/generated/prisma/client";

type ThemeRow = { themeName: string; themeType: string; _count: { themeName: number } };
type FlagRow = {
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

  const [themes, flags] = await Promise.all([
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
  ]);

  // Group flags by student name
  const flagsByStudent = (flags as FlagRow[]).reduce(
    (acc: Record<string, Array<{ reason: string; ticketTitle: string; ticketId: string }>>, flag: FlagRow) => {
      const name = flag.studentName;
      if (!acc[name]) acc[name] = [];
      acc[name].push({
        reason: flag.reason,
        ticketTitle: flag.analysis.exitTicket.title,
        ticketId: flag.analysis.exitTicket.id,
      });
      return acc;
    },
    {} as Record<string, Array<{ reason: string; ticketTitle: string; ticketId: string }>>
  );

  type FlagEntry = { studentName: string; count: number; flags: Array<{ reason: string; ticketTitle: string; ticketId: string }> };
  const sortedStudents: FlagEntry[] = Object.entries(flagsByStudent)
    .map(([studentName, flagList]) => ({ studentName, count: flagList.length, flags: flagList }))
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

      {themes.length === 0 && flags.length === 0 ? (
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
                  <Card key={entry.studentName} className="border-slate-200">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{entry.studentName}</CardTitle>
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
