import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({ resolved: z.boolean() });

/** Marks a follow-up flag as checked in (or reopens it). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "resolved must be true or false" }, { status: 400 });
  }

  const { id } = await params;
  const flag = await db.followUpFlag.findUnique({
    where: { id },
    select: { analysis: { select: { exitTicket: { select: { userId: true } } } } },
  });
  if (!flag || flag.analysis.exitTicket.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.followUpFlag.update({
    where: { id },
    data: { resolvedAt: parsed.data.resolved ? new Date() : null },
    select: { resolvedAt: true },
  });
  return NextResponse.json(updated);
}
