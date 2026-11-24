import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketEditor } from "@/components/ticket-editor";

export default async function NewTicketPage() {
  const session = await auth();
  const periods = await db.classPeriod.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return <TicketEditor heading="New exit ticket" periods={periods} />;
}
