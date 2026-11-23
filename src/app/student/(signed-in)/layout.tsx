import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/session";
import { StudentHeader } from "@/components/student-header";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/student/login");
  }

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader name={`${student.firstName} ${student.lastName}`.trim()} />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
