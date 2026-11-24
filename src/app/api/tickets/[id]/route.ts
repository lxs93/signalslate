import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { updateTicketSchema } from "@/lib/validations";
import { createQuestions, ownsPeriods } from "@/lib/tickets";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await db.exitTicket.findUnique({ where: { id } });
  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateTicketSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { periodIds, questions, standard, ...details } = parsed.data;

  if (periodIds && !(await ownsPeriods(session.user.id, periodIds))) {
    return NextResponse.json({ error: "Invalid class period" }, { status: 400 });
  }

  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (questions) {
      // Answers point at questions, so questions are fixed once anyone has answered.
      const answered = await tx.submission.count({ where: { exitTicketId: id } });
      if (answered > 0) return "locked" as const;
      await tx.question.deleteMany({ where: { exitTicketId: id } });
      await createQuestions(tx, id, questions);
    }
    await tx.exitTicket.update({
      where: { id },
      data: {
        ...details,
        ...(standard !== undefined ? { standard: standard || null } : {}),
        ...(periodIds ? { periods: { set: periodIds.map((pid) => ({ id: pid })) } } : {}),
      },
    });
    return "ok" as const;
  });

  if (result === "locked") {
    return NextResponse.json(
      { error: "Students have already answered this ticket, so its questions can't be changed." },
      { status: 409 }
    );
  }

  return new NextResponse(null, { status: 204 });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await db.exitTicket.findUnique({ where: { id } });
  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Questions, submissions, analyses and their flags cascade.
  await db.exitTicket.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
