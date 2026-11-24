import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { StudentLoginForm } from "@/components/student-login-form";

function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  // Only allow same-site paths
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/student";
}

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; code?: string | string[] }>;
}) {
  const { next, code } = await searchParams;
  const nextPath = safeNext(next);

  // Only skip the form for a student who still exists
  if (await getCurrentStudent()) {
    redirect(nextPath);
  }

  return (
    <main>
      <StudentLoginForm nextPath={nextPath} initialCode={Array.isArray(code) ? code[0] : code} />
    </main>
  );
}
