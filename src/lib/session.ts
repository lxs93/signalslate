import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** The signed-in teacher's id, or null for students and signed-out visitors. */
export async function getTeacherId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user || session.user.role === "student") return null;
  return session.user.id ?? null;
}

/** The signed-in student's id, or null for teachers and signed-out visitors. */
export async function getStudentId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.role !== "student") return null;
  return session.user.studentId ?? null;
}

/**
 * The signed-in student's record, or null. Also null when the session points
 * at a student who has since been deleted, so stale sessions act signed out.
 */
export async function getCurrentStudent() {
  const studentId = await getStudentId();
  if (!studentId) return null;
  return db.student.findUnique({ where: { id: studentId } });
}
