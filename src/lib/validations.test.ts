import { describe, expect, it } from "vitest";
import { checkStudentNames, createTicketSchema, registerSchema, parseStudentNames, sectionSchema, studentSubmissionSchema, submissionFeedbackSchema, updateTicketSchema } from "./validations";

describe("parseStudentNames", () => {
  it("reads First Last, Last, First, and single names", () => {
    expect(parseStudentNames("Priya Patel\nGarcia, Noah\n\n  Mo  \nAna  de la Cruz")).toEqual([
      { firstName: "Priya", lastName: "Patel" },
      { firstName: "Noah", lastName: "Garcia" },
      { firstName: "Mo", lastName: "" },
      { firstName: "Ana", lastName: "de la Cruz" },
    ]);
  });
});

const short = (prompt: string) => ({ prompt, questionType: "SHORT_ANSWER" as const, orderIndex: 0 });
const details = { title: "T", subject: "S", lessonTopic: "L" };

describe("createTicketSchema", () => {
  it("accepts a ticket with 2 questions", () => {
    expect(createTicketSchema.safeParse({ ...details, questions: [short("a"), short("b")] }).success).toBe(true);
  });

  it("needs 2 to 4 questions", () => {
    expect(createTicketSchema.safeParse({ ...details, questions: [short("a")] }).success).toBe(false);
    const five = ["a", "b", "c", "d", "e"].map(short);
    expect(createTicketSchema.safeParse({ ...details, questions: five }).success).toBe(false);
  });

  it("needs 2 options on a multiple-choice question", () => {
    const mc = {
      prompt: "pick",
      questionType: "MULTIPLE_CHOICE" as const,
      orderIndex: 1,
      options: [{ optionText: "only", orderIndex: 0 }],
    };
    const r = createTicketSchema.safeParse({ ...details, questions: [short("a"), mc] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/at least 2 options/);
  });

  it("rejects blank required fields", () => {
    expect(
      createTicketSchema.safeParse({ ...details, title: "   ", questions: [short("a"), short("b")] }).success
    ).toBe(false);
  });
});

describe("updateTicketSchema", () => {
  it("allows partial updates", () => {
    expect(updateTicketSchema.safeParse({ periodIds: [] }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ revealAnswers: true }).success).toBe(true);
  });
});

describe("updateTicketSchema closesAt", () => {
  it("takes an ISO time or null", () => {
    expect(updateTicketSchema.safeParse({ closesAt: "2026-11-24T22:45:00.000Z" }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ closesAt: "2026-11-24T14:45:00-08:00" }).success).toBe(true);
    expect(updateTicketSchema.safeParse({ closesAt: null }).success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(updateTicketSchema.safeParse({ closesAt: "2:45 PM" }).success).toBe(false);
  });
});

describe("submissionFeedbackSchema", () => {
  it("trims notes and allows clearing them", () => {
    expect(submissionFeedbackSchema.parse({ feedback: "  Nice work.  " })).toEqual({ feedback: "Nice work." });
    expect(submissionFeedbackSchema.parse({ feedback: null })).toEqual({ feedback: null });
  });

  it("caps notes at 1000 characters", () => {
    expect(submissionFeedbackSchema.safeParse({ feedback: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("sectionSchema", () => {
  it("trims names and requires text", () => {
    expect(sectionSchema.parse({ name: "  Period 2 " })).toEqual({ name: "Period 2" });
    expect(sectionSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(sectionSchema.safeParse({ name: 123 }).success).toBe(false);
    expect(sectionSchema.safeParse(null).success).toBe(false);
  });

  it("caps names at 60 characters", () => {
    expect(sectionSchema.safeParse({ name: "x".repeat(60) }).success).toBe(true);
    expect(sectionSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });
});

describe("checkStudentNames", () => {
  const n = (firstName: string, lastName = "") => ({ firstName, lastName });

  it("accepts a normal class list", () => {
    expect(checkStudentNames([n("Priya", "Patel"), n("Mo")])).toBeNull();
  });

  it("needs at least one name and at most 100", () => {
    expect(checkStudentNames([])).toBe("Enter at least one name");
    expect(checkStudentNames(Array.from({ length: 101 }, (_, i) => n(`Kid${i}`)))).toBe("Add up to 100 students at a time");
    expect(checkStudentNames(Array.from({ length: 100 }, (_, i) => n(`Kid${i}`)))).toBeNull();
  });

  it("names the student whose name is too long", () => {
    expect(checkStudentNames([n("Ana", "x".repeat(51))])).toMatch(/^“Ana x+…” is too long/);
  });
});

describe("ticket text limits", () => {
  const ticket = (over: object = {}) => ({
    title: "T",
    subject: "S",
    lessonTopic: "L",
    questions: [
      { prompt: "a", questionType: "SHORT_ANSWER" as const, orderIndex: 0 },
      { prompt: "b", questionType: "MULTIPLE_CHOICE" as const, orderIndex: 1, options: [{ optionText: "x", orderIndex: 0 }, { optionText: "y", orderIndex: 1 }] },
    ],
    ...over,
  });

  it("accepts text at the limits", () => {
    expect(createTicketSchema.safeParse(ticket({ title: "x".repeat(120), subject: "x".repeat(60), lessonTopic: "x".repeat(120) })).success).toBe(true);
  });

  it("rejects text past them", () => {
    expect(createTicketSchema.safeParse(ticket({ title: "x".repeat(121) })).success).toBe(false);
    expect(createTicketSchema.safeParse(ticket({ subject: "x".repeat(61) })).success).toBe(false);
    const longPrompt = ticket();
    longPrompt.questions[0].prompt = "x".repeat(501);
    expect(createTicketSchema.safeParse(longPrompt).success).toBe(false);
    const longOption = ticket();
    longOption.questions[1].options![0].optionText = "x".repeat(201);
    expect(createTicketSchema.safeParse(longOption).success).toBe(false);
  });
});

describe("studentSubmissionSchema", () => {
  const answer = (answerText: string) => ({ responses: [{ questionId: "q1", answerText }] });

  it("caps written answers at 2,000 characters", () => {
    expect(studentSubmissionSchema.safeParse(answer("x".repeat(2000))).success).toBe(true);
    expect(studentSubmissionSchema.safeParse(answer("x".repeat(2001))).success).toBe(false);
  });

  it("rejects an unreasonable number of answers", () => {
    const many = { responses: Array.from({ length: 11 }, (_, i) => ({ questionId: `q${i}`, answerText: "x" })) };
    expect(studentSubmissionSchema.safeParse(many).success).toBe(false);
  });
});

describe("registerSchema email", () => {
  it("stores emails trimmed and in lowercase", () => {
    expect(registerSchema.parse({ name: "Ana", email: "  Ana@School.ORG ", password: "12345678" }).email).toBe("ana@school.org");
  });

  it("still rejects things that aren't emails", () => {
    expect(registerSchema.safeParse({ name: "Ana", email: "ana at school", password: "12345678" }).success).toBe(false);
  });
});
