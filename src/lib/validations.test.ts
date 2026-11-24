import { describe, expect, it } from "vitest";
import { createTicketSchema, parseStudentNames, submissionFeedbackSchema, updateTicketSchema } from "./validations";

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
