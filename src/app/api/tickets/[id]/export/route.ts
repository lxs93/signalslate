import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { confidenceLabel } from "@/lib/confidence";

/** Downloads a ticket's responses as CSV, one row per student. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await db.exitTicket.findUnique({
    where: { id },
    include: {
      periods: { select: { id: true, name: true } },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      },
      submissions: {
        orderBy: { submittedAt: "asc" },
        include: {
          responses: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              enrollments: { select: { periodId: true } },
            },
          },
        },
      },
    },
  });
  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const periodName = new Map(ticket.periods.map((p) => [p.id, p.name]));
  const sectionsOf = (enrollments: { periodId: string }[]) =>
    enrollments.map((e) => periodName.get(e.periodId)).filter(Boolean).join(", ");

  // Enrolled students who haven't answered still get a row
  const answeredIds = ticket.submissions.map((s) => s.studentId).filter((x): x is string => !!x);
  const missing = await db.student.findMany({
    where: {
      teacherId: session.user.id,
      enrollments: { some: { periodId: { in: ticket.periods.map((p) => p.id) } } },
      id: { notIn: answeredIds },
    },
    select: { firstName: true, lastName: true, enrollments: { select: { periodId: true } } },
  });

  const keyed = ticket.questions.filter(
    (q) => q.questionType === "MULTIPLE_CHOICE" && q.options.some((o) => o.isCorrect)
  );

  const header = ["Last name", "First name", "Section", "Status", "Submitted at"];
  if (ticket.askConfidence) header.push("How sure");
  ticket.questions.forEach((q, i) => {
    header.push(`Q${i + 1}: ${q.prompt}`);
    if (keyed.includes(q)) header.push(`Q${i + 1} correct`);
  });
  if (keyed.length > 0) header.push(`Score (of ${keyed.length})`);

  type Row = { last: string; first: string; cells: (string | number)[] };
  const rows: Row[] = [];

  for (const sub of ticket.submissions) {
    const cells: (string | number)[] = [
      sub.student ? sectionsOf(sub.student.enrollments) : "",
      "Submitted",
      sub.submittedAt.toISOString(),
      ...(ticket.askConfidence ? [confidenceLabel(sub.confidence) ?? ""] : []),
    ];
    let score = 0;
    for (const q of ticket.questions) {
      const r = sub.responses.find((x) => x.questionId === q.id);
      if (q.questionType === "SHORT_ANSWER") {
        cells.push(r?.answerText ?? "");
        continue;
      }
      const picked = q.options.find((o) => o.id === r?.selectedOptionId);
      cells.push(picked?.optionText ?? "");
      if (keyed.includes(q)) {
        const right = !!picked?.isCorrect;
        if (right) score++;
        cells.push(picked ? (right ? "yes" : "no") : "");
      }
    }
    if (keyed.length > 0) cells.push(score);
    rows.push({
      last: sub.student?.lastName ?? "",
      first: sub.student?.firstName ?? sub.studentName,
      cells,
    });
  }

  for (const s of missing) {
    rows.push({ last: s.lastName, first: s.firstName, cells: [sectionsOf(s.enrollments), "Not submitted"] });
  }

  rows.sort((a, b) =>
    (a.last || a.first).localeCompare(b.last || b.first) || a.first.localeCompare(b.first)
  );

  const csv = toCsv([
    header,
    ...rows.map((r) => {
      const row = [r.last, r.first, ...r.cells];
      return [...row, ...Array(header.length - row.length).fill("")];
    }),
  ]);
  const slug = ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "exit-ticket";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
