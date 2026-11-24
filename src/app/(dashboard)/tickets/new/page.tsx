import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadTicketDraft } from "@/lib/tickets";
import { TicketEditor } from "@/components/ticket-editor";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { from } = await searchParams;
  const session = await auth();
  const userId = session!.user!.id!;

  const periods = await db.classPeriod.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  // ?from=<ticketId> starts a copy of one of the teacher's tickets
  const source = typeof from === "string" ? await loadTicketDraft(from, userId) : null;
  const initial = source ? { ...source.draft, title: `${source.draft.title} (copy)` } : undefined;

  return (
    <TicketEditor
      heading={source ? "Duplicate exit ticket" : "New exit ticket"}
      periods={periods}
      initial={initial}
    />
  );
}
