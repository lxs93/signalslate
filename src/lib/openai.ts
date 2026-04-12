import OpenAI from "openai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_JSON_SCHEMA,
  buildAnalysisPrompt,
} from "@/lib/prompt";
import type { AnalysisResult } from "@/types";
import type { QuestionWithOptions, SubmissionWithResponses } from "@/types";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

interface TicketContext {
  title: string;
  subject: string;
  lessonTopic: string;
  questions: QuestionWithOptions[];
}

export async function analyzeExitTicket(
  ticket: TicketContext,
  submissions: SubmissionWithResponses[]
): Promise<AnalysisResult> {
  const userPrompt = buildAnalysisPrompt(ticket, submissions);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: ANALYSIS_JSON_SCHEMA,
    },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response from AI");

  return JSON.parse(content) as AnalysisResult;
}
