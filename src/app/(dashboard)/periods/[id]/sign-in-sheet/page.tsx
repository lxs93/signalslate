import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { byLastName } from "@/lib/names";

export default async function SignInSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const period = await db.classPeriod.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { student: true },
      },
    },
  });
  if (!period || period.userId !== userId) {
    notFound();
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const loginUrl = `${proto}://${host}/student/login`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <Link
            href={`/periods/${period.id}`}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← {period.name}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Sign-in sheet</h1>
          <p className="text-sm text-slate-500 mt-1">Print and cut out one card per student.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-3 print:gap-0">
        {period.enrollments.map((e) => e.student).sort(byLastName).map((student) => (
          <div
            key={student.id}
            className="border border-dashed border-slate-300 rounded-md px-4 py-3 break-inside-avoid print:rounded-none"
          >
            <p className="text-xs text-slate-500">{period.name}</p>
            <p className="text-base font-semibold text-slate-900">
              {student.firstName} {student.lastName}
            </p>
            <div className="mt-2 grid grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Class code</p>
                <p className="font-mono font-semibold tracking-wider">{period.joinCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">PIN</p>
                <p className="font-mono font-semibold tracking-wider">{student.pin}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 break-all">{loginUrl}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
