import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketCard, type TicketWithCount } from "@/components/ticket-card";

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
    },
  });

  if (!period || period.userId !== userId) {
    notFound();
  }

  const tickets = period.exitTickets as TicketWithCount[];

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
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">New exit ticket</Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-600 font-medium">No tickets in this period yet</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create a ticket and assign it to this period
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
