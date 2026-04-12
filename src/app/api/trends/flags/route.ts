import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all flags for this teacher, grouped by student name
  const flags = await db.followUpFlag.findMany({
    where: {
      analysis: {
        exitTicket: { userId: session.user.id },
      },
    },
    include: {
      analysis: {
        include: {
          exitTicket: {
            select: { id: true, title: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by student name
  const byStudent: Record<
    string,
    { count: number; flags: Array<{ reason: string; ticketTitle: string; ticketId: string }> }
  > = {};

  for (const flag of flags) {
    const name = flag.studentName;
    if (!byStudent[name]) byStudent[name] = { count: 0, flags: [] };
    byStudent[name].count++;
    byStudent[name].flags.push({
      reason: flag.reason,
      ticketTitle: flag.analysis.exitTicket.title,
      ticketId: flag.analysis.exitTicket.id,
    });
  }

  const result = Object.entries(byStudent)
    .map(([studentName, data]) => ({ studentName, ...data }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(result);
}
