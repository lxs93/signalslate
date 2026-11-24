import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submissionFeedbackSchema } from "@/lib/validations";

/** PATCH: set or clear the teacher's note on one submission. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, submissionId } = await params;
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: { exitTicketId: true, exitTicket: { select: { userId: true } } },
  });
  if (!submission || submission.exitTicketId !== id || submission.exitTicket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = submissionFeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const feedback = parsed.data.feedback || null;

  await db.submission.update({
    where: { id: submissionId },
    data: { feedback, feedbackAt: feedback ? new Date() : null },
  });
  return new NextResponse(null, { status: 204 });
}
