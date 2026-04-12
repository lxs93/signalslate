import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalysisWithDetails } from "@/types";

interface AnalysisPanelProps {
  analysis: AnalysisWithDetails;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const strengths = analysis.strengthsText
    ? analysis.strengthsText.split("\n").filter(Boolean)
    : [];
  const misconceptions = analysis.misconceptionsText
    ? analysis.misconceptionsText.split("\n").filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Class Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed">{analysis.overallSummary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-emerald-700">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Misconceptions */}
        {misconceptions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-700">Common Misconceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {misconceptions.map((m, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Students to Check In With */}
      {analysis.followUpFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Students to Check In With</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              These are signals to support your judgment — not final assessments.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.followUpFlags.map((flag, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                    {flag.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{flag.studentName}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{flag.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reteach Suggestion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reteach Suggestion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed">{analysis.reteachSuggestion}</p>
          </CardContent>
        </Card>

        {/* Follow-up Question */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-600">Suggested Follow-up Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 italic leading-relaxed">
              &ldquo;{analysis.followupQuestion}&rdquo;
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Theme Tags */}
      {analysis.themes.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
              Theme Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.themes.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t.themeName}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
