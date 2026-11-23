import { auth } from "@/lib/auth";

/** The signed-in teacher's id, or null when no teacher is signed in. */
export async function getTeacherId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
