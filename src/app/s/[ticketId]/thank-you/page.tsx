export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-600 text-xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Response submitted</h1>
        <p className="text-sm text-slate-500 mt-2">
          Thanks! Your teacher will review your response.
        </p>
      </div>
    </div>
  );
}
