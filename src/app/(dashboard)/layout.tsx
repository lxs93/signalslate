import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavSidebar } from "@/components/nav-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role === "student") {
    redirect("/student");
  }
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <NavSidebar />
      <main className="flex-1 min-w-0 p-4 md:ml-56 md:p-8 print:ml-0 print:p-0">{children}</main>
    </div>
  );
}
