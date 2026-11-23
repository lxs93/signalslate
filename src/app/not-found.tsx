import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-slate-400">404</p>
        <h1 className="text-xl font-bold text-slate-900 mt-1">Page not found</h1>
        <p className="text-sm text-slate-500 mt-2">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-medium text-slate-900 hover:underline"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
