import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { FRAMEWORKS, GRADES } from "@/lib/standards";
import { searchStandards } from "@/lib/standards-search";

/** GET /api/standards?q=ratio&framework=Common%20Core&grade=6 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const q = (params.get("q") ?? "").slice(0, 100);
  const framework = params.get("framework") ?? "";
  const grade = params.get("grade") ?? "";

  const results = await searchStandards(q, {
    framework: (FRAMEWORKS as readonly string[]).includes(framework) ? framework : undefined,
    grade: (GRADES as readonly string[]).includes(grade) ? grade : undefined,
  });
  return NextResponse.json(results);
}
