import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadTicketDraft } from "@/lib/tickets";
import { TicketEditor } from "@/components/ticket-editor";
import { duplicateDraft, followUpDraft } from "@/lib/ticket-drafts";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { from, followup } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const periods = await db.classPeriod.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  // ?from=<ticketId> starts a copy of one of the teacher's tickets;
  // ?followup=<ticketId> starts from its latest analysis's follow-up question
  const sourceId = typeof followup === "string" ? followup : typeof from === "string" ? from : null;
  const source = sourceId ? await loadTicketDraft(sourceId, userId) : null;
  const followupQuestion =
    source && typeof followup === "string"
      ? (
          await db.analysis.findFirst({
            where: { exitTicketId: followup },
            orderBy: { createdAt: "desc" },
            select: { followupQuestion: true },
          })
        )?.followupQuestion
      : undefined;

  const initial = !source
    ? undefined
    : followupQuestion
      ? followUpDraft(source.draft, followupQuestion)
      : duplicateDraft(source.draft);

  return (
    <TicketEditor
      heading={followupQuestion ? "Follow-up exit ticket" : source ? "Duplicate exit ticket" : "New exit ticket"}
      periods={periods}
      initial={initial}
    />
  );
}
