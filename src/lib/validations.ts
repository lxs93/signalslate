import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const questionOptionSchema = z.object({
  optionText: z.string().trim().min(1, "Option text is required"),
  orderIndex: z.number(),
  isCorrect: z.boolean().nullable().optional(),
});

export const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Question prompt is required"),
    questionType: z.enum(["SHORT_ANSWER", "MULTIPLE_CHOICE"]),
    orderIndex: z.number(),
    options: z.array(questionOptionSchema).max(6).optional(),
  })
  .refine((q) => q.questionType !== "MULTIPLE_CHOICE" || (q.options?.length ?? 0) >= 2, {
    message: "Multiple choice questions need at least 2 options",
  });

export const MAX_TICKET_STANDARDS = 6;

export const standardTagSchema = z.object({
  standardId: z.string().min(1).nullable(),
  code: z.string().trim().min(1, "A standard needs a code").max(80, "Standard codes can be up to 80 characters"),
});

export const ticketDetailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  lessonTopic: z.string().trim().min(1, "Lesson topic is required"),
  standards: z
    .array(standardTagSchema)
    .max(MAX_TICKET_STANDARDS, `A ticket can have up to ${MAX_TICKET_STANDARDS} standards`)
    .optional(),
  periodIds: z.array(z.string()).optional(),
  askConfidence: z.boolean().optional(),
});

export const ticketQuestionsSchema = z
  .array(questionSchema)
  .min(2, "At least 2 questions are required")
  .max(4, "Maximum 4 questions allowed");

export const createTicketSchema = ticketDetailsSchema.extend({
  questions: ticketQuestionsSchema,
});

export const updateTicketSchema = ticketDetailsSchema.partial().extend({
  questions: ticketQuestionsSchema.optional(),
  revealAnswers: z.boolean().optional(),
  /** When the ticket stops taking answers; null clears it */
  closesAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const studentSubmissionSchema = z.object({
  /** 1 (not sure) to 4 (very sure); required when the ticket asks */
  confidence: z.number().int().min(1).max(4).nullable().optional(),
  responses: z.array(
    z.object({
      questionId: z.string(),
      answerText: z.string().nullable().optional(),
      selectedOptionId: z.string().nullable().optional(),
    })
  ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type StudentSubmissionInput = z.infer<typeof studentSubmissionSchema>;

export const addStudentsSchema = z.union([
  z.object({ names: z.string().min(1, "Enter at least one name") }),
  z.object({ studentId: z.string().uuid() }),
]);

export const updateStudentSchema = z.union([
  z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim(),
  }),
  z.object({ resetPin: z.literal(true) }),
]);

/**
 * One student per line. Accepts "First Last" or "Last, First".
 * A single word is taken as a first name.
 */
export function parseStudentNames(text: string): { firstName: string; lastName: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((line) => {
      if (line.includes(",")) {
        const [last, ...rest] = line.split(",");
        return { firstName: rest.join(",").trim(), lastName: last.trim() };
      }
      const [first, ...rest] = line.split(" ");
      return { firstName: first, lastName: rest.join(" ") };
    })
    .filter((n) => n.firstName);
}
