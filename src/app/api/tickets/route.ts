import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createTicketSchema } from "@/lib/validations";
import { createQuestions, ownsPeriods } from "@/lib/tickets";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await db.exitTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true, analyses: true } },
    },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = createTicketSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, subject, lessonTopic, standard, periodIds = [], questions } = parsed.data;

  if (!(await ownsPeriods(userId, periodIds))) {
    return NextResponse.json({ error: "Invalid class period" }, { status: 400 });
  }

  const ticket = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.exitTicket.create({
      data: {
        userId,
        title,
        subject,
        lessonTopic,
        standard: standard || null,
        periods: { connect: periodIds.map((id) => ({ id })) },
      },
    });
    await createQuestions(tx, created.id, questions);
    return created;
  });

  return NextResponse.json(ticket, { status: 201 });
}
