import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOpenNow } from "@/lib/ticket-status";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await db.exitTicket.findUnique({ where: { id } });
  if (!ticket || ticket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Closing or reopening by hand replaces any scheduled close time
  const updated = await db.exitTicket.update({
    where: { id },
    data: { isOpen: !isOpenNow(ticket), closesAt: null },
  });

  return NextResponse.json({ isOpen: updated.isOpen });
}
