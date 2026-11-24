import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeacherId } from "@/lib/session";
import { generatePin } from "@/lib/codes";
import { addStudentsSchema, parseStudentNames } from "@/lib/validations";
import { readJson } from "@/lib/request";

/** Add new students (pasted names) or enroll an existing student in this period. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const teacherId = await getTeacherId();
  if (!teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = await db.classPeriod.findUnique({ where: { id } });
  if (!period || period.userId !== teacherId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = addStudentsSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if ("studentId" in parsed.data) {
    const student = await db.student.findUnique({ where: { id: parsed.data.studentId } });
    if (!student || student.teacherId !== teacherId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    await db.enrollment.upsert({
      where: { studentId_periodId: { studentId: student.id, periodId: id } },
      create: { studentId: student.id, periodId: id },
      update: {},
    });
    return NextResponse.json({ added: 1 }, { status: 201 });
  }

  const names = parseStudentNames(parsed.data.names);
  if (names.length === 0) {
    return NextResponse.json({ error: "Enter at least one name" }, { status: 400 });
  }

  await db.$transaction(
    names.map((n) =>
      db.student.create({
        data: {
          teacherId,
          firstName: n.firstName,
          lastName: n.lastName,
          pin: generatePin(),
          enrollments: { create: { periodId: id } },
        },
      })
    )
  );

  return NextResponse.json({ added: names.length }, { status: 201 });
}
