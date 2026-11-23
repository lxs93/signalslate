import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStudentId } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        include: { questions: { orderBy: { orderIndex: "asc" } } },
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

  return (
    <div>
      <Link href="/student" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
        ← Your exit tickets
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {ticket.subject} · {ticket.lessonTopic} · Submitted{" "}
          {submission.submittedAt.toLocaleString()}
        </p>
      </div>

      <div className="space-y-4">
        {ticket.questions.map((q, i) => {
          const answer = answerFor(q.id);
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
