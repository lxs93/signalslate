import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StudentHeader } from "@/components/student-header";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "student" || !session.user.studentId) {
    redirect("/student/login");
  }

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader name={session.user.name ?? "Student"} />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
