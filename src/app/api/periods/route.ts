import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateJoinCode } from "@/lib/codes";
import { readJson } from "@/lib/request";
import { sectionSchema } from "@/lib/validations";

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

  const parsed = sectionSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name } = parsed.data;

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
