import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { CreateTicketInput } from "@/lib/validations";
import type { StandardTag } from "@/lib/standards";

type QuestionInput = CreateTicketInput["questions"][number];
type StandardInput = NonNullable<CreateTicketInput["standards"]>[number];

/**
 * Replaces a ticket's standards. Official ones take their code from the
 * standards table; an unknown id is kept as custom text. Repeats are dropped.
 */
export async function writeTicketStandards(
  tx: Prisma.TransactionClient,
  exitTicketId: string,
  standards: StandardInput[]
) {
  const ids = standards.map((s) => s.standardId).filter((x): x is string => !!x);
  const known = new Map(
    (await tx.standard.findMany({ where: { id: { in: ids } }, select: { id: true, code: true } })).map(
      (s) => [s.id, s.code]
    )
  );

  const seen = new Set<string>();
  const rows = [];
  for (const s of standards) {
    const officialCode = s.standardId ? known.get(s.standardId) : undefined;
    const row = officialCode
      ? { standardId: s.standardId, code: officialCode }
      : { standardId: null, code: s.code.trim() };
    const key = row.standardId ?? `custom:${row.code.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...row, exitTicketId, orderIndex: rows.length });
  }

  await tx.ticketStandard.deleteMany({ where: { exitTicketId } });
  if (rows.length) await tx.ticketStandard.createMany({ data: rows });
}

/** Include for loading a ticket's standards in order, with the official details. */
export const ticketStandardsInclude = {
  orderBy: { orderIndex: "asc" },
  include: { standard: { select: { framework: true, description: true } } },
} satisfies Prisma.ExitTicket$standardsArgs;

/** Flattens loaded ticket standards into the StandardTag shape. */
export function toStandardTags(
  rows: { standardId: string | null; code: string; standard: { framework: string; description: string } | null }[]
): StandardTag[] {
  return rows.map((r) => ({
    standardId: r.standardId,
    code: r.code,
    ...(r.standard ? { framework: r.standard.framework, description: r.standard.description } : {}),
  }));
}

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
      standards: ticketStandardsInclude,
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
      standards: toStandardTags(ticket.standards),
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
