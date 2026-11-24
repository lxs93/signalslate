import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStudentId } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOpenNow } from "@/lib/ticket-status";

export default async function StudentAnswersPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const studentId = (await getStudentId())!;

  const submission = await db.submission.findUnique({
    where: { exitTicketId_studentId: { exitTicketId: ticketId, studentId } },
    include: {
      exitTicket: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { options: { select: { id: true, optionText: true, isCorrect: true } } },
          },
        },
      },
      responses: { include: { selectedOption: { select: { optionText: true } } } },
    },
  });
  if (!submission) {
    notFound();
  }

  const { exitTicket: ticket } = submission;
  const answerFor = (questionId: string) => {
    const r = submission.responses.find((x) => x.questionId === questionId);
    return r?.selectedOption?.optionText ?? r?.answerText ?? null;
  };

  // The answer key is only shown once the teacher closes the ticket and turns it on.
  const showKey = ticket.revealAnswers && !isOpenNow(ticket);
  const keyFor = (q: (typeof ticket.questions)[number]) => {
    if (!showKey || q.questionType !== "MULTIPLE_CHOICE") return null;
    const correct = q.options.find((o) => o.isCorrect);
    if (!correct) return null;
    const picked = submission.responses.find((x) => x.questionId === q.id)?.selectedOptionId;
    return { correctText: correct.optionText, isRight: picked === correct.id };
  };

  return (
    <div>
      <Link href="/student" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
        ← Your exit tickets
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {ticket.subject} · {ticket.lessonTopic} · Submitted{" "}
          {submission.submittedAt.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {ticket.revealAnswers && isOpenNow(ticket) && (
        <p className="text-sm text-slate-500 mb-4">
          Your teacher will show the correct answers after this ticket closes.
        </p>
      )}

      <div className="space-y-4">
        {ticket.questions.map((q, i) => {
          const answer = answerFor(q.id);
          const key = keyFor(q);
          return (
            <Card key={q.id} className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {i + 1}. {q.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {answer ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{answer}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No answer</p>
                )}
                {key && (
                  <p
                    className={`mt-2 text-sm font-medium ${key.isRight ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {key.isRight ? "✓ Correct" : `Correct answer: ${key.correctText}`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
