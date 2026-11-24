import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/codes";
import { byFirstName } from "@/lib/names";

/** Look up a class by join code and list its students for the sign-in name picker. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const period = await db.classPeriod.findUnique({
    where: { joinCode: normalizeJoinCode(code) },
    include: {
      user: { select: { name: true } },
      enrollments: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!period) {
    return NextResponse.json({ error: "No class found with that code" }, { status: 404 });
  }

  return NextResponse.json({
    joinCode: period.joinCode,
    periodName: period.name,
    teacherName: period.user.name,
    students: period.enrollments.map((e) => e.student).sort(byFirstName).map((student) => ({
      id: student.id,
      // First name + last initial is enough to tell students apart in a list
      displayName: student.lastName
        ? `${student.firstName} ${student.lastName[0]}.`
        : student.firstName,
    })),
  });
}
