import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateJoinCode } from "@/lib/codes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periods = await db.classPeriod.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Retry on the rare join code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const period = await db.classPeriod.create({
        data: { userId: session.user.id, name, joinCode: generateJoinCode() },
      });
      return NextResponse.json(period, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
}
