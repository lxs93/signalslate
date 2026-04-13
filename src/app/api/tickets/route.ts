import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

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

  try {
    const body = await req.json();
    const { title, subject, lessonTopic, standard, periodIds, questions } = body;

    if (!title || !subject || !lessonTopic) {
      return NextResponse.json(
        { error: "title, subject, and lessonTopic are required" },
        { status: 400 }
      );
    }

    // Verify all periods belong to this teacher
    if (Array.isArray(periodIds) && periodIds.length > 0) {
      const periods = await db.classPeriod.findMany({ where: { id: { in: periodIds } } });
      if (periods.some((p) => p.userId !== session.user.id)) {
        return NextResponse.json({ error: "Invalid class period" }, { status: 400 });
      }
    }
    if (!questions || questions.length < 2 || questions.length > 4) {
      return NextResponse.json(
        { error: "Between 2 and 4 questions are required" },
        { status: 400 }
      );
    }

    const ticket = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.exitTicket.create({
        data: {
          userId: session.user!.id!,
          title,
          subject,
          lessonTopic,
          standard: standard || null,
          periods: Array.isArray(periodIds) && periodIds.length > 0
            ? { connect: periodIds.map((pid: string) => ({ id: pid })) }
            : undefined,
        },
      });

      for (const q of questions) {
        const question = await tx.question.create({
          data: {
            exitTicketId: created.id,
            prompt: q.prompt,
            questionType: q.questionType,
            orderIndex: q.orderIndex,
          },
        });

        if (q.questionType === "MULTIPLE_CHOICE" && q.options?.length > 0) {
          await tx.questionOption.createMany({
            data: q.options.map(
              (o: { optionText: string; orderIndex: number; isCorrect?: boolean | null }) => ({
                questionId: question.id,
                optionText: o.optionText,
                orderIndex: o.orderIndex,
                isCorrect: o.isCorrect ?? null,
              })
            ),
          });
        }
      }

      return created;
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
