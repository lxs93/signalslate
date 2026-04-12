import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExitTicket } from "@/generated/prisma/client";

type TicketWithCount = ExitTicket & {
  _count: { submissions: number; analyses: number };
};

export default async function DashboardPage() {
  const session = await auth();
  const tickets = await db.exitTicket.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true, analyses: true } },
    },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
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

      {tickets.length === 0 ? (
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
        <div className="space-y-3">
          {tickets.map((ticket: TicketWithCount) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card className="hover:border-slate-300 transition-colors cursor-pointer">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {ticket.title}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {ticket.subject} · {ticket.lessonTopic}
                      </p>
                    </div>
                    <Badge
                      variant={ticket.isOpen ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {ticket.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{ticket._count.submissions} response{ticket._count.submissions !== 1 ? "s" : ""}</span>
                    <span>{ticket._count.analyses > 0 ? "Analyzed" : "Not analyzed"}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
