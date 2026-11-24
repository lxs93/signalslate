import type { ChoiceResult } from "@/lib/choice-results";

/** Bar chart of how students answered one multiple-choice question. */
export function ChoiceResults({ result }: { result: ChoiceResult }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-slate-600 mb-2">
        {result.percentCorrect !== null ? (
          <>
            <span className="font-semibold text-slate-900">{result.percentCorrect}% correct</span>{" "}
            ({result.correctCount} of {result.total})
          </>
        ) : (
          <>
            {result.total} {result.total === 1 ? "answer" : "answers"} · no correct answer marked
          </>
        )}
      </p>
      <div className="space-y-1.5">
        {result.options.map((o) => {
          const isTopWrong = result.topWrongOptionIds.includes(o.id);
          const bar = o.isCorrect ? "bg-emerald-500" : isTopWrong ? "bg-amber-400" : "bg-slate-300";
          return (
            <div key={o.id}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={`min-w-0 ${o.isCorrect ? "text-emerald-700 font-medium" : "text-slate-700"}`}>
                  {o.optionText}
                  {o.isCorrect && " ✓"}
                  {isTopWrong && (
                    <span className="ml-1.5 text-amber-700">
                      · most common wrong answer{result.topWrongOptionIds.length > 1 && " (tied)"}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {o.count} · {o.percent}%
                </span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${o.percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
