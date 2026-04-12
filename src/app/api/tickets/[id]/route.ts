import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getTicketForUser(ticketId: string, userId: string) {
  const ticket = await db.exitTicket.findUnique({
    where: { id: ticketId },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: { orderBy: { orderIndex: "asc" } },
        },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          responses: {
            include: { selectedOption: true },
          },
        },
      },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          themes: true,
          followUpFlags: true,
        },
      },
      _count: { select: { submissions: true } },
    },
  });

  if (!ticket || ticket.userId !== userId) return null;
  return ticket;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await getTicketForUser(id, session.user.id);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}
