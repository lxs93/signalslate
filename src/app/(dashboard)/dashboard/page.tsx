import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodManager } from "@/components/period-manager";
import { TicketCard, type TicketWithCount } from "@/components/ticket-card";
import type { ClassPeriod } from "@/generated/prisma/client";

type PeriodWithCounts = ClassPeriod & {
  _count: { exitTickets: number };
  exitTickets: { isOpen: boolean }[];
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const periods = await db.classPeriod.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { exitTickets: true } },
      exitTickets: { select: { isOpen: true } },
    },
  });

  const unassigned = await db.exitTicket.findMany({
    where: { userId, periods: { none: {} } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true, analyses: true } } },
  });

  const hasPeriods = periods.length > 0;
  const isEmpty = !hasPeriods && unassigned.length === 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exit Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create tickets and collect student responses
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">New exit ticket</Link>
        </Button>
      </div>

      <div className="mb-6">
        <PeriodManager periods={periods} />
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-600 font-medium">No exit tickets yet</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create your first one to get started
            </p>
            <Button asChild>
              <Link href="/tickets/new">Create exit ticket</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {hasPeriods && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Sections
              </p>
              <div className="space-y-2.5">
                {periods.map((period: PeriodWithCounts) => {
                  const openCount = period.exitTickets.filter((t) => t.isOpen).length;
                  return (
                    <Link key={period.id} href={`/periods/${period.id}`} className="block">
                      <Card className="hover:border-slate-300 transition-colors cursor-pointer">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{period.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {period._count.exitTickets} ticket{period._count.exitTickets !== 1 ? "s" : ""}
                              {openCount > 0 && <> · {openCount} open</>}
                            </p>
                          </div>
                          <span className="text-slate-300 text-sm">→</span>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {unassigned.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Unassigned Tickets
              </p>
              <div className="space-y-2.5">
                {unassigned.map((ticket: TicketWithCount) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
