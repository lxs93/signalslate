import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavSidebar } from "@/components/nav-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <NavSidebar />
      <main className="flex-1 ml-56 p-8 min-w-0">{children}</main>
    </div>
  );
}
