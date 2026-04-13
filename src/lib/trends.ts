import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

export async function getOrRefreshTrendsSummary(userId: string, periodId: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Return cached summary if already generated today
  const existing = await db.trendsSummary.findFirst({
    where: { userId, periodId: periodId ?? null },
  });
  if (existing && existing.generatedAt >= today) {
    return existing;
  }

  // Fetch trend data
  const ticketFilter = {
    userId,
    ...(periodId ? { periods: { some: { id: periodId } } } : {}),
  };

  const [themes, flags, ticketCount] = await Promise.all([
    db.analysisTheme.groupBy({
      by: ["themeName", "themeType"],
      _count: { themeName: true },
      where: { analysis: { exitTicket: ticketFilter } },
      orderBy: { _count: { themeName: "desc" } },
      take: 20,
    }),
    db.followUpFlag.findMany({
      where: { analysis: { exitTicket: ticketFilter } },
    }),
    db.exitTicket.count({ where: { ...ticketFilter, analyses: { some: {} } } }),
  ]);

  if (themes.length === 0 && flags.length === 0) return existing ?? null;

  const flagsByStudent: Record<string, number> = {};
  for (const flag of flags) {
    flagsByStudent[flag.studentName] = (flagsByStudent[flag.studentName] ?? 0) + 1;
  }
  const repeatedlyFlagged = Object.entries(flagsByStudent)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (flagged in ${count} tickets)`);

  const scopeLabel = periodId
    ? (await db.classPeriod.findUnique({ where: { id: periodId }, select: { name: true } }))?.name ?? "this section"
    : "all sections";

  const prompt = `You are an expert K-12 instructional coach reviewing aggregated trend data from a teacher's exit tickets.

Scope: ${scopeLabel}
Exit tickets analyzed: ${ticketCount}

RECURRING THEMES (name — type — occurrences):
${themes.map((t) => `- ${t.themeName} (${t.themeType}) — ${t._count.themeName}x`).join("\n")}

${repeatedlyFlagged.length > 0 ? `STUDENTS FLAGGED MULTIPLE TIMES:\n${repeatedlyFlagged.map((s) => `- ${s}`).join("\n")}` : "No students flagged multiple times."}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert K-12 instructional coach. Analyze student assessment trend data and provide structured, actionable insights for teachers.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trends_summary",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overall_summary: {
              type: "string",
              description: "2-3 sentence overview of class-wide understanding patterns.",
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "3-5 specific concepts or skills students are demonstrating.",
            },
            misconceptions: {
              type: "array",
              items: { type: "string" },
              description: "3-5 specific recurring misconceptions or gaps.",
            },
          },
          required: ["overall_summary", "strengths", "misconceptions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) return existing ?? null;

  const result = JSON.parse(content);

  const data = {
    overallSummary: result.overall_summary,
    strengths: result.strengths,
    misconceptions: result.misconceptions,
    generatedAt: new Date(),
  };

  const summary = existing
    ? await db.trendsSummary.update({ where: { id: existing.id }, data })
    : await db.trendsSummary.create({ data: { userId, periodId: periodId ?? null, ...data } });

  return summary;
}
