import type { QuestionWithOptions, SubmissionWithResponses } from "@/types";

interface TicketContext {
  title: string;
  subject: string;
  lessonTopic: string;
  questions: QuestionWithOptions[];
}

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert K-12 instructional coach analyzing student exit ticket responses.
Your job is to help teachers quickly understand what their class learned and where they struggled.
Be specific, concise, and actionable. Reference student names only in the students_to_check_in_with field.
Use lowercase, 2-3 word theme_tags (e.g. "fraction operations", "main idea", "text evidence").
Frame student follow-up flags as supportive signals for the teacher, not judgments about students.
Never label a student as failing, at risk, or struggling — use neutral observational language.`;

export function buildAnalysisPrompt(
  ticket: TicketContext,
  submissions: SubmissionWithResponses[]
): string {
  const questionLines = ticket.questions
    .map((q) => {
      const typeLabel =
        q.questionType === "SHORT_ANSWER" ? "short-answer" : "multiple-choice";
      let line = `Q${q.orderIndex + 1} (${typeLabel}): ${q.prompt}`;
      if (q.questionType === "MULTIPLE_CHOICE" && q.options.length > 0) {
        const optionLines = q.options
          .map((o) => `    - ${o.optionText}${o.isCorrect ? " [correct]" : ""}`)
          .join("\n");
        line += `\n${optionLines}`;
      }
      return line;
    })
    .join("\n");

  const submissionLines = submissions
    .map((sub) => {
      const responseLines = ticket.questions
        .map((q) => {
          const response = sub.responses.find((r) => r.questionId === q.id);
          if (!response) return `  Q${q.orderIndex + 1}: [no response]`;
          if (q.questionType === "SHORT_ANSWER") {
            const text = response.answerText?.trim();
            return `  Q${q.orderIndex + 1}: ${text || "[blank]"}`;
          }
          const selected = response.selectedOption?.optionText;
          return `  Q${q.orderIndex + 1}: ${selected || "[no selection]"}`;
        })
        .join("\n");
      return `--- ${sub.studentName} ---\n${responseLines}`;
    })
    .join("\n\n");

  return `Exit Ticket: "${ticket.title}"
Subject: ${ticket.subject}
Lesson Topic: ${ticket.lessonTopic}
Number of students who submitted: ${submissions.length}

QUESTIONS:
${questionLines}

STUDENT RESPONSES:
${submissionLines}

Analyze this class's responses and return your structured JSON analysis.`;
}

export const ANALYSIS_JSON_SCHEMA = {
  name: "exit_ticket_analysis",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      overall_summary: { type: "string" as const },
      strengths: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      misconceptions: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      students_to_check_in_with: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            student_name: { type: "string" as const },
            reason: { type: "string" as const },
          },
          required: ["student_name", "reason"],
          additionalProperties: false,
        },
      },
      reteach_suggestion: { type: "string" as const },
      followup_question: { type: "string" as const },
      theme_tags: {
        type: "array" as const,
        items: { type: "string" as const },
      },
    },
    required: [
      "overall_summary",
      "strengths",
      "misconceptions",
      "students_to_check_in_with",
      "reteach_suggestion",
      "followup_question",
      "theme_tags",
    ],
    additionalProperties: false,
  },
};
