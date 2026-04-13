import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExitTicket } from "@/generated/prisma/client";

export type TicketWithCount = ExitTicket & {
  _count: { submissions: number; analyses: number };
};

export function TicketCard({ ticket }: { ticket: TicketWithCount }) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="block">
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
            <span className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${ticket.isOpen ? "bg-emerald-500" : "bg-slate-300"}`} />
              {ticket.isOpen ? "Open" : "Closed"}
            </span>
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
  );
}
