import { auth } from "@/lib/auth";

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
