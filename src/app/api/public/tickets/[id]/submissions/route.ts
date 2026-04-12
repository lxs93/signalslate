import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentSubmissionSchema } from "@/lib/validations";
import { Prisma } from "@/generated/prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ticket = await db.exitTicket.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
            // Never expose isCorrect to students
            select: { id: true, optionText: true, orderIndex: true },
          },
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: ticket.id,
    title: ticket.title,
    subject: ticket.subject,
    lessonTopic: ticket.lessonTopic,
    isOpen: ticket.isOpen,
    questions: ticket.questions,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ticket = await db.exitTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!ticket.isOpen) {
    return NextResponse.json(
      { error: "This exit ticket is no longer accepting submissions" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = studentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { studentName, responses } = parsed.data;

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const submission = await tx.submission.create({
        data: { exitTicketId: id, studentName },
      });

      await tx.response.createMany({
        data: responses.map((r) => ({
          submissionId: submission.id,
          questionId: r.questionId,
          answerText: r.answerText ?? null,
          selectedOptionId: r.selectedOptionId ?? null,
        })),
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}
