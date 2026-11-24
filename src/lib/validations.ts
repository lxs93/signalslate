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

/** Longest text allowed in each part of a ticket */
export const TICKET_LIMITS = { title: 120, subject: 60, lessonTopic: 120, prompt: 500, option: 200 } as const;

export const questionOptionSchema = z.object({
  optionText: z
    .string()
    .trim()
    .min(1, "Option text is required")
    .max(TICKET_LIMITS.option, `Answer options can be up to ${TICKET_LIMITS.option} characters`),
  orderIndex: z.number(),
  isCorrect: z.boolean().nullable().optional(),
});

export const questionSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Question prompt is required")
      .max(TICKET_LIMITS.prompt, `Questions can be up to ${TICKET_LIMITS.prompt} characters`),
    questionType: z.enum(["SHORT_ANSWER", "MULTIPLE_CHOICE"]),
    orderIndex: z.number(),
    options: z.array(questionOptionSchema).max(6).optional(),
  })
  .refine((q) => q.questionType !== "MULTIPLE_CHOICE" || (q.options?.length ?? 0) >= 2, {
    message: "Multiple choice questions need at least 2 options",
  });

export const MAX_SECTION_NAME = 60;

/** A section's name, e.g. "Period 2" or "Math 7B" */
export const sectionSchema = z.object({
  name: z
    .string("Name is required")
    .trim()
    .min(1, "Name is required")
    .max(MAX_SECTION_NAME, `Section names can be up to ${MAX_SECTION_NAME} characters`),
});

export const MAX_TICKET_STANDARDS = 6;

export const standardTagSchema = z.object({
  standardId: z.string().min(1).nullable(),
  code: z.string().trim().min(1, "A standard needs a code").max(80, "Standard codes can be up to 80 characters"),
});

export const ticketDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TICKET_LIMITS.title, `Titles can be up to ${TICKET_LIMITS.title} characters`),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(TICKET_LIMITS.subject, `Subjects can be up to ${TICKET_LIMITS.subject} characters`),
  lessonTopic: z
    .string()
    .trim()
    .min(1, "Lesson topic is required")
    .max(TICKET_LIMITS.lessonTopic, `Lesson topics can be up to ${TICKET_LIMITS.lessonTopic} characters`),
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

export const MAX_FEEDBACK_LENGTH = 1000;

/** A teacher's note on one submission; empty or null removes it */
export const submissionFeedbackSchema = z.object({
  feedback: z
    .string()
    .trim()
    .max(MAX_FEEDBACK_LENGTH, `Notes can be up to ${MAX_FEEDBACK_LENGTH} characters`)
    .nullable(),
});

export const MAX_ANSWER_LENGTH = 2000;

export const studentSubmissionSchema = z.object({
  /** 1 (not sure) to 4 (very sure); required when the ticket asks */
  confidence: z.number().int().min(1).max(4).nullable().optional(),
  responses: z
    .array(
      z.object({
        questionId: z.string(),
        answerText: z
          .string()
          .max(MAX_ANSWER_LENGTH, `Answers can be up to ${MAX_ANSWER_LENGTH} characters`)
          .nullable()
          .optional(),
        selectedOptionId: z.string().nullable().optional(),
      })
    )
    // A ticket has at most 4 questions; leave room for nothing else
    .max(10, "Too many answers"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type StudentSubmissionInput = z.infer<typeof studentSubmissionSchema>;

export const MAX_NAMES_PER_PASTE = 100;
export const MAX_NAME_LENGTH = 50;

export const addStudentsSchema = z.union([
  // Room for 100 names with some slack; the per-name limits are checked after parsing
  z.object({ names: z.string().min(1, "Enter at least one name").max(10_000, "That's too much text to add at once") }),
  z.object({ studentId: z.string().uuid() }),
]);

export const updateStudentSchema = z.union([
  z.object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(MAX_NAME_LENGTH, `Names can be up to ${MAX_NAME_LENGTH} characters`),
    lastName: z.string().trim().max(MAX_NAME_LENGTH, `Names can be up to ${MAX_NAME_LENGTH} characters`),
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

/** Why a pasted class list can't be added as is, or null when it's fine. */
export function checkStudentNames(names: { firstName: string; lastName: string }[]): string | null {
  if (names.length === 0) return "Enter at least one name";
  if (names.length > MAX_NAMES_PER_PASTE) return `Add up to ${MAX_NAMES_PER_PASTE} students at a time`;
  const long = names.find((n) => n.firstName.length > MAX_NAME_LENGTH || n.lastName.length > MAX_NAME_LENGTH);
  if (long) return `“${`${long.firstName} ${long.lastName}`.trim().slice(0, 30)}…” is too long. Names can be up to ${MAX_NAME_LENGTH} characters`;
  return null;
}
