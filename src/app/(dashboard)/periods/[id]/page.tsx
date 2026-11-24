import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketCard, type TicketWithCount } from "@/components/ticket-card";
import { RosterManager } from "@/components/roster-manager";
import { byLastName } from "@/lib/names";
import { pinBlock } from "@/lib/pin-limit";

export default async function PeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const period = await db.classPeriod.findUnique({
    where: { id },
    include: {
      exitTickets: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { submissions: true, analyses: true } } },
      },
      enrollments: { include: { student: true } },
    },
  });

  if (!period || period.userId !== userId) {
    notFound();
  }

  const tickets = period.exitTickets as TicketWithCount[];

  const students = period.enrollments.map((e) => e.student).sort(byLastName);
  const otherStudents = (
    await db.student.findMany({ where: { teacherId: userId, enrollments: { none: { periodId: id } } } })
  ).sort(byLastName);
  const pick = (s: (typeof students)[number]) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    pin: s.pin,
    lockedOut: pinBlock(s) !== null,
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Exit Tickets
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{period.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} · Class code{" "}
            <span className="font-mono font-semibold text-slate-900 tracking-wider">
              {period.joinCode}
            </span>
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">New exit ticket</Link>
        </Button>
      </div>

      <div className="mb-8">
        <RosterManager
          periodId={period.id}
          students={students.map(pick)}
          otherStudents={otherStudents.map(pick)}
        />
      </div>

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Exit Tickets
      </p>
      {tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-600 font-medium">No tickets in this section yet</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create a ticket and assign it to this section
            </p>
            <Button asChild>
              <Link href="/tickets/new">Create exit ticket</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
