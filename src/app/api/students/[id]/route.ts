import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeacherId } from "@/lib/session";
import { generatePin } from "@/lib/codes";
import { updateStudentSchema } from "@/lib/validations";
import { readJson } from "@/lib/request";

async function findOwnStudent(id: string, teacherId: string) {
  const student = await db.student.findUnique({ where: { id } }).catch(() => null);
  return student && student.teacherId === teacherId ? student : null;
}

/** Rename a student, or give them a new PIN with { resetPin: true }. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teacherId = await getTeacherId();
  if (!teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await findOwnStudent(id, teacherId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateStudentSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data =
    "resetPin" in parsed.data
      ? { pin: generatePin(), failedPinAttempts: 0, pinLockedUntil: null }
      : { firstName: parsed.data.firstName, lastName: parsed.data.lastName };

  const updated = await db.student.update({ where: { id }, data });
  return NextResponse.json(updated);
}

/** Delete a student and everything they submitted. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teacherId = await getTeacherId();
  if (!teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await findOwnStudent(id, teacherId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.student.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
