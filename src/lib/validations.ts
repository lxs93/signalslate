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
  optionText: z.string().min(1, "Option text is required"),
  orderIndex: z.number(),
  isCorrect: z.boolean().nullable().optional(),
});

export const questionSchema = z.object({
  prompt: z.string().min(1, "Question prompt is required"),
  questionType: z.enum(["SHORT_ANSWER", "MULTIPLE_CHOICE"]),
  orderIndex: z.number(),
  options: z.array(questionOptionSchema).optional(),
});

export const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  lessonTopic: z.string().min(1, "Lesson topic is required"),
  questions: z
    .array(questionSchema)
    .min(2, "At least 2 questions are required")
    .max(4, "Maximum 4 questions allowed"),
});

export const studentSubmissionSchema = z.object({
  studentName: z.string().min(1, "Name is required"),
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
