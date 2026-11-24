import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { CreateTicketInput } from "@/lib/validations";

type QuestionInput = CreateTicketInput["questions"][number];

/** Writes a ticket's questions and their options, in the order given. */
export async function createQuestions(
  tx: Prisma.TransactionClient,
  exitTicketId: string,
  questions: QuestionInput[]
) {
  for (const [i, q] of questions.entries()) {
    const question = await tx.question.create({
      data: {
        exitTicketId,
        prompt: q.prompt,
        questionType: q.questionType,
        orderIndex: i,
      },
    });

    if (q.questionType === "MULTIPLE_CHOICE" && q.options?.length) {
      await tx.questionOption.createMany({
        data: q.options.map((o, j) => ({
          questionId: question.id,
          optionText: o.optionText,
          orderIndex: j,
          isCorrect: o.isCorrect ?? null,
        })),
      });
    }
  }
}

/** True when every period id belongs to the teacher. */
export async function ownsPeriods(userId: string, periodIds: string[]) {
  if (periodIds.length === 0) return true;
  const count = await db.classPeriod.count({
    where: { id: { in: periodIds }, userId },
  });
  return count === new Set(periodIds).size;
}

/** Loads a teacher's ticket in the shape the ticket editor takes, or null. */
export async function loadTicketDraft(ticketId: string, userId: string) {
  const ticket = await db.exitTicket.findUnique({
    where: { id: ticketId },
    include: {
      periods: { select: { id: true } },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
      _count: { select: { submissions: true } },
    },
  });
  if (!ticket || ticket.userId !== userId) return null;

  return {
    submissionCount: ticket._count.submissions,
    draft: {
      title: ticket.title,
      subject: ticket.subject,
      lessonTopic: ticket.lessonTopic,
      standard: ticket.standard ?? "",
      periodIds: ticket.periods.map((p) => p.id),
      questions: ticket.questions.map((q, i) => ({
        prompt: q.prompt,
        questionType: q.questionType,
        orderIndex: i,
        options: q.options.map((o, j) => ({
          optionText: o.optionText,
          orderIndex: j,
          isCorrect: o.isCorrect,
        })),
      })),
    },
  };
}
