import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTeacherId } from "@/lib/session";

/** Remove a student from this period. The student account is kept. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const { id, studentId } = await params;
  const teacherId = await getTeacherId();
  if (!teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = await db.classPeriod.findUnique({ where: { id } });
  if (!period || period.userId !== teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Student ids are UUIDs; anything else can't be enrolled (and would make Postgres throw)
  if (!z.uuid().safeParse(studentId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.enrollment.deleteMany({ where: { periodId: id, studentId } });
  return new NextResponse(null, { status: 204 });
}
