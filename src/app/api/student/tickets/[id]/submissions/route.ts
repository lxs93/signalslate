import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentId } from "@/lib/session";
import { getTicketForStudent } from "@/lib/student-tickets";
import { studentSubmissionSchema } from "@/lib/validations";
import { checkResponses } from "@/lib/submission-check";
import { Prisma } from "@/generated/prisma/client";
import { isOpenNow } from "@/lib/ticket-status";
import { readJson } from "@/lib/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const studentId = await getStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  const ticket = await getTicketForStudent(id, studentId);
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isOpenNow(ticket)) {
    return NextResponse.json(
      { error: "This exit ticket is no longer accepting submissions" },
      { status: 403 }
    );
  }
  if (ticket.submissions.length > 0) {
    return NextResponse.json({ error: "You already submitted this exit ticket" }, { status: 409 });
  }

  const parsed = studentSubmissionSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const confidence = ticket.askConfidence ? parsed.data.confidence ?? null : null;
  if (ticket.askConfidence && confidence === null) {
    return NextResponse.json({ error: "Please say how sure you are about your answers" }, { status: 400 });
  }

  // One answer per question, of the right kind, using that question's own choices
  const checked = checkResponses(ticket.questions, parsed.data.responses);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  const { responses } = checked;

  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const studentName = `${student.firstName} ${student.lastName}`.trim();

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const submission = await tx.submission.create({
        data: { exitTicketId: id, studentId, studentName, confidence },
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
  } catch (e) {
    // Unique (ticket, student): a double-click or second tab got there first
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You already submitted this exit ticket" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}
