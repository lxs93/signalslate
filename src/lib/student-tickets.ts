import { db } from "@/lib/db";

/**
 * A ticket the student may answer: it must be assigned to a period the
 * student is enrolled in. Never includes which option is correct.
 */
export async function getTicketForStudent(ticketId: string, studentId: string) {
  return db.exitTicket.findFirst({
    where: {
      id: ticketId,
      periods: { some: { enrollments: { some: { studentId } } } },
    },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, optionText: true, orderIndex: true },
          },
        },
      },
      submissions: { where: { studentId }, select: { id: true } },
    },
  });
}

export type StudentTicket = NonNullable<Awaited<ReturnType<typeof getTicketForStudent>>>;
