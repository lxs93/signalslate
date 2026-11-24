import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { getTicketForStudent } from "@/lib/student-tickets";
import { StudentHeader } from "@/components/student-header";
import { ExitTicketForm } from "@/components/exit-ticket-form";
import { isOpenNow } from "@/lib/ticket-status";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="text-center max-w-sm">
        <p className="text-slate-700 font-medium text-lg">{title}</p>
        <p className="text-sm text-slate-500 mt-2">{body}</p>
        <Link href="/student" className="inline-block mt-6 text-sm font-medium text-slate-900 hover:underline">
          ← Your exit tickets
        </Link>
      </div>
    </div>
  );
}

export default async function StudentTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const student = await getCurrentStudent();
  if (!student) {
    redirect(`/student/login?next=${encodeURIComponent(`/s/${ticketId}`)}`);
  }

  const ticket = await getTicketForStudent(ticketId, student.id);
  if (ticket && ticket.submissions.length > 0) {
    redirect(`/student/tickets/${ticketId}`);
  }

  let content: React.ReactNode;
  if (!ticket) {
    content = (
      <Message
        title="Exit ticket not found"
        body="This exit ticket isn't assigned to any of your classes. Check the link with your teacher."
      />
    );
  } else if (!isOpenNow(ticket)) {
    content = (
      <Message
        title="Submissions are closed"
        body="This exit ticket is no longer accepting responses. Check with your teacher."
      />
    );
  } else {
    content = <ExitTicketForm ticket={ticket} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader name={`${student.firstName} ${student.lastName}`.trim()} />
      <main>{content}</main>
    </div>
  );
}
