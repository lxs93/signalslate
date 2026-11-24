import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeExitTicket } from "@/lib/openai";
import { Prisma } from "@/generated/prisma/client";
import { matchStudentId } from "@/lib/match-student";
import { ticketStandardsInclude } from "@/lib/tickets";

export async function GET(
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

  const analysis = await db.analysis.findFirst({
    where: { exitTicketId: id },
    orderBy: { createdAt: "desc" },
    include: { themes: true, followUpFlags: true },
  });

  if (!analysis) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await db.exitTicket.findUnique({
    where: { id },
    include: {
      standards: ticketStandardsInclude,
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
      submissions: {
        include: {
          responses: { include: { selectedOption: true } },
        },
      },
    },
  });

  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (ticket.submissions.length < 3) {
    return NextResponse.json(
      { error: "At least 3 submissions are required to run analysis" },
      { status: 422 }
    );
  }

  try {
    const standards = ticket.standards.map((s) => ({
      code: s.code,
      framework: s.standard?.framework,
      description: s.standard?.description,
    }));
    const result = await analyzeExitTicket({ ...ticket, standards }, ticket.submissions);

    const analysis = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.analysis.create({
        data: {
          exitTicketId: id,
          overallSummary: result.overall_summary,
          strengthsText: result.strengths.join("\n"),
          misconceptionsText: result.misconceptions.join("\n"),
          reteachSuggestion: result.reteach_suggestion,
          followupQuestion: result.followup_question,
          rawJson: result as object,
        },
      });

      // Save theme tags — lowercase for deduplication
      if (result.theme_tags.length > 0) {
        await tx.analysisTheme.createMany({
          data: result.theme_tags.map((tag) => ({
            analysisId: created.id,
            themeName: tag.toLowerCase().trim(),
            themeType: "MISCONCEPTION" as const,
          })),
        });
      }

      // Save follow-up flags. A student the teacher already checked in with
      // about this ticket stays checked in when an earlier run flagged them too.
      if (result.students_to_check_in_with.length > 0) {
        const checkedIn = await tx.followUpFlag.findMany({
          where: { analysis: { exitTicketId: id }, resolvedAt: { not: null } },
          select: { studentId: true, studentName: true, resolvedAt: true },
        });
        const resolvedFor = (studentId: string | null, name: string) =>
          checkedIn.find((f) =>
            studentId ? f.studentId === studentId : !f.studentId && f.studentName === name
          )?.resolvedAt ?? null;

        await tx.followUpFlag.createMany({
          data: result.students_to_check_in_with.map((s) => {
            const studentId = matchStudentId(s.student_name, ticket.submissions);
            return {
              analysisId: created.id,
              studentId,
              studentName: s.student_name,
              reason: s.reason,
              resolvedAt: resolvedFor(studentId, s.student_name),
            };
          }),
        });
      }

      // The new analysis replaces any earlier ones (their checked-in state was
      // carried over above), so Trends and the Students page count each ticket once.
      await tx.analysis.deleteMany({ where: { exitTicketId: id, id: { not: created.id } } });

      return tx.analysis.findUnique({
        where: { id: created.id },
        include: { themes: true, followUpFlags: true },
      });
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
