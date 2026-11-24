import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadTicketDraft } from "@/lib/tickets";
import { TicketEditor } from "@/components/ticket-editor";

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const loaded = await loadTicketDraft(id, userId);
  if (!loaded) notFound();

  const periods = await db.classPeriod.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <TicketEditor
      heading="Edit exit ticket"
      ticketId={id}
      periods={periods}
      initial={loaded.draft}
      questionsLocked={loaded.submissionCount > 0}
    />
  );
}
