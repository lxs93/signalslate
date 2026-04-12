import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const themes = await db.analysisTheme.groupBy({
    by: ["themeName", "themeType"],
    _count: { themeName: true },
    where: {
      analysis: {
        exitTicket: { userId: session.user.id },
      },
    },
    orderBy: { _count: { themeName: "desc" } },
    take: 20,
  });

  type ThemeRow = { themeName: string; themeType: string; _count: { themeName: number } };
  return NextResponse.json(
    (themes as ThemeRow[]).map((t: ThemeRow) => ({
      themeName: t.themeName,
      themeType: t.themeType,
      count: t._count.themeName,
    }))
  );
}
