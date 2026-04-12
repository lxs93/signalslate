import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@signalslate.com";
const DEMO_PASSWORD = "demo1234";

async function main() {
  console.log("Seeding database...");

  // Clean up existing demo data
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await db.exitTicket.deleteMany({ where: { userId: existing.id } });
    await db.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await db.user.create({
    data: {
      name: "Ms. Rivera",
      email: DEMO_EMAIL,
      passwordHash,
    },
  });

  // ─── Ticket 1: ELA ────────────────────────────────────────────────────────
  const ticket1 = await db.exitTicket.create({
    data: {
      userId: user.id,
      title: "Main Idea Check",
      subject: "ELA",
      lessonTopic: "Identifying main idea vs. supporting details",
      isOpen: false,
    },
  });

  const q1a = await db.question.create({
    data: {
      exitTicketId: ticket1.id,
      prompt: "In your own words, what is the main idea of a passage?",
      questionType: "SHORT_ANSWER",
      orderIndex: 0,
    },
  });

  const q1b = await db.question.create({
    data: {
      exitTicketId: ticket1.id,
      prompt: "Which of the following best describes the main idea of the passage we read?",
      questionType: "MULTIPLE_CHOICE",
      orderIndex: 1,
    },
  });

  const [opt1, opt2, opt3, opt4] = await Promise.all([
    db.questionOption.create({ data: { questionId: q1b.id, optionText: "The story is about a dog named Max.", orderIndex: 0, isCorrect: null } }),
    db.questionOption.create({ data: { questionId: q1b.id, optionText: "Friendship can help animals survive in the wild.", orderIndex: 1, isCorrect: true } }),
    db.questionOption.create({ data: { questionId: q1b.id, optionText: "Max likes to play in the snow.", orderIndex: 2, isCorrect: null } }),
    db.questionOption.create({ data: { questionId: q1b.id, optionText: "Animals need food and water.", orderIndex: 3, isCorrect: null } }),
  ]);

  const students1 = [
    { name: "Jordan", sa: "The main idea is the most important thing the whole text is about", mc: opt2.id },
    { name: "Maria", sa: "", mc: opt1.id },
    { name: "Darius", sa: "It's what the story is mostly about", mc: opt2.id },
    { name: "Priya", sa: "The main idea is like the big message of the whole passage", mc: opt2.id },
    { name: "Alex", sa: "I don't really get the difference between main idea and the details", mc: opt3.id },
    { name: "Sofia", sa: "Main idea is the main thing happening", mc: opt2.id },
    { name: "Marcus", sa: "It's the point the author is trying to make", mc: opt2.id },
    { name: "Emma", sa: "Main idea is what the text is all about but I wrote about the dog", mc: opt1.id },
    { name: "Ethan", sa: "The most important idea in the whole reading", mc: opt2.id },
    { name: "Aisha", sa: "Main idea is what you learn from the whole text not just one part", mc: opt2.id },
    { name: "Noah", sa: "I think it is about what happens in the beginning", mc: opt3.id },
    { name: "Lily", sa: "The central message or big idea", mc: opt2.id },
  ];

  for (const student of students1) {
    const sub = await db.submission.create({
      data: {
        exitTicketId: ticket1.id,
        studentName: student.name,
        submittedAt: new Date(Date.now() - Math.random() * 3600000),
      },
    });
    await db.response.createMany({
      data: [
        { submissionId: sub.id, questionId: q1a.id, answerText: student.sa || null, selectedOptionId: null },
        { submissionId: sub.id, questionId: q1b.id, answerText: null, selectedOptionId: student.mc },
      ],
    });
  }

  // Create pre-built analysis for ticket 1
  const analysis1 = await db.analysis.create({
    data: {
      exitTicketId: ticket1.id,
      overallSummary:
        "Most students demonstrate a general understanding of main idea as the central message of a text. However, several students confused specific plot details with the main idea, and a few struggled to distinguish between what happens in a passage and what the passage is primarily about. Multiple-choice responses show that the most common distractor involved a surface-level detail about Max.",
      strengthsText:
        "Several students articulated the main idea in their own words with accuracy.\nMost students selected the correct multiple-choice answer.",
      misconceptionsText:
        "Some students confused a specific story detail (Max the dog) with the main idea.\nA few students described the beginning of the story rather than the overall main idea.\nOne student explicitly noted confusion between main idea and supporting details.",
      reteachSuggestion:
        "Use a two-column anchor chart: 'Main Idea' vs. 'Supporting Details.' Show one short paragraph and model sorting sentences into each column. Then have students practice with a partner using a new text.",
      followupQuestion:
        "Pick one sentence from the passage that supports the main idea. Explain why that sentence supports it rather than being the main idea itself.",
      rawJson: {
        overall_summary: "Most students demonstrate a general understanding...",
        strengths: ["Several students articulated correctly", "Most students selected the correct MC answer"],
        misconceptions: ["Confusion between detail and main idea", "Beginning-of-story focus"],
        students_to_check_in_with: [
          { student_name: "Maria", reason: "Submitted a blank short-answer response." },
          { student_name: "Alex", reason: "Explicitly stated confusion between main idea and details." },
          { student_name: "Emma", reason: "Short-answer response describes the character detail rather than the main idea." },
          { student_name: "Noah", reason: "Describes only the beginning of the story rather than the overall main idea." },
        ],
        reteach_suggestion: "Use a two-column anchor chart...",
        followup_question: "Pick one sentence...",
        theme_tags: ["main idea", "supporting details", "text evidence"],
      },
    },
  });

  await db.analysisTheme.createMany({
    data: [
      { analysisId: analysis1.id, themeName: "main idea", themeType: "MISCONCEPTION" },
      { analysisId: analysis1.id, themeName: "supporting details", themeType: "MISCONCEPTION" },
      { analysisId: analysis1.id, themeName: "text evidence", themeType: "GENERAL" },
    ],
  });

  await db.followUpFlag.createMany({
    data: [
      { analysisId: analysis1.id, studentName: "Maria", reason: "Submitted a blank short-answer response." },
      { analysisId: analysis1.id, studentName: "Alex", reason: "Explicitly stated confusion between main idea and details." },
      { analysisId: analysis1.id, studentName: "Emma", reason: "Short-answer describes the character detail rather than the main idea." },
      { analysisId: analysis1.id, studentName: "Noah", reason: "Describes only the beginning of the story rather than the overall main idea." },
    ],
  });

  // ─── Ticket 2: Math ───────────────────────────────────────────────────────
  const ticket2 = await db.exitTicket.create({
    data: {
      userId: user.id,
      title: "Adding Unlike Fractions",
      subject: "Math",
      lessonTopic: "Adding fractions with unlike denominators",
      isOpen: true,
    },
  });

  const q2a = await db.question.create({
    data: {
      exitTicketId: ticket2.id,
      prompt: "In your own words, describe how to add fractions with unlike denominators.",
      questionType: "SHORT_ANSWER",
      orderIndex: 0,
    },
  });

  const q2b = await db.question.create({
    data: {
      exitTicketId: ticket2.id,
      prompt: "What is 1/2 + 1/3?",
      questionType: "MULTIPLE_CHOICE",
      orderIndex: 1,
    },
  });

  const [m1, m2, m3, m4] = await Promise.all([
    db.questionOption.create({ data: { questionId: q2b.id, optionText: "2/5", orderIndex: 0, isCorrect: null } }),
    db.questionOption.create({ data: { questionId: q2b.id, optionText: "5/6", orderIndex: 1, isCorrect: true } }),
    db.questionOption.create({ data: { questionId: q2b.id, optionText: "2/6", orderIndex: 2, isCorrect: null } }),
    db.questionOption.create({ data: { questionId: q2b.id, optionText: "3/5", orderIndex: 3, isCorrect: null } }),
  ]);

  const q2c = await db.question.create({
    data: {
      exitTicketId: ticket2.id,
      prompt: "What do you still find confusing about fractions?",
      questionType: "SHORT_ANSWER",
      orderIndex: 2,
    },
  });

  const students2 = [
    { name: "Jordan", sa1: "Find the least common denominator then convert both fractions", mc: m2.id, sa2: "Nothing it makes sense now" },
    { name: "Maria", sa1: "You just add the tops and bottoms together", mc: m1.id, sa2: "Why you can't just add across" },
    { name: "Darius", sa1: "Get a common denominator and then add the numerators", mc: m2.id, sa2: "I'm good" },
    { name: "Alex", sa1: "", mc: m1.id, sa2: "I don't understand why the denominators have to be the same" },
    { name: "Sofia", sa1: "First find LCD then make equivalent fractions then add tops", mc: m2.id, sa2: "Nothing" },
    { name: "Marcus", sa1: "Find common denominator multiply both fractions and add", mc: m3.id, sa2: "I understand the LCD part but not always sure I do it right" },
    { name: "Emma", sa1: "Change both fractions to have the same bottom number then add the top numbers", mc: m2.id, sa2: "Nothing really" },
    { name: "Ethan", sa1: "LCD method convert add", mc: m2.id, sa2: "Feels good" },
  ];

  for (const student of students2) {
    const sub = await db.submission.create({
      data: {
        exitTicketId: ticket2.id,
        studentName: student.name,
        submittedAt: new Date(Date.now() - Math.random() * 1800000),
      },
    });
    await db.response.createMany({
      data: [
        { submissionId: sub.id, questionId: q2a.id, answerText: student.sa1 || null, selectedOptionId: null },
        { submissionId: sub.id, questionId: q2b.id, answerText: null, selectedOptionId: student.mc },
        { submissionId: sub.id, questionId: q2c.id, answerText: student.sa2, selectedOptionId: null },
      ],
    });
  }

  // Pre-built analysis for ticket 2
  const analysis2 = await db.analysis.create({
    data: {
      exitTicketId: ticket2.id,
      overallSummary:
        "Most students understand the process of finding a common denominator before adding fractions. Several students, however, still apply the incorrect strategy of adding numerators and denominators directly. Multiple-choice responses confirm that a portion of the class chose 2/5, suggesting they added across without finding a common denominator.",
      strengthsText:
        "Most students correctly described the LCD process in their own words.\nSeveral students correctly computed 1/2 + 1/3 = 5/6.",
      misconceptionsText:
        "Two students described adding numerators and denominators directly (e.g. 1/2 + 1/3 = 2/5).\nOne student selected 2/6, suggesting they found a common denominator but did not convert both fractions before adding.",
      reteachSuggestion:
        "Use fraction bars to show visually why 1/2 + 1/3 cannot equal 2/5. Demonstrate the equivalence steps: 1/2 = 3/6 and 1/3 = 2/6, then add.",
      followupQuestion:
        "If you add 1/4 + 2/3, what is the least common denominator? Show each step.",
      rawJson: {},
    },
  });

  await db.analysisTheme.createMany({
    data: [
      { analysisId: analysis2.id, themeName: "fraction operations", themeType: "MISCONCEPTION" },
      { analysisId: analysis2.id, themeName: "common denominator", themeType: "MISCONCEPTION" },
      { analysisId: analysis2.id, themeName: "equivalent fractions", themeType: "GENERAL" },
    ],
  });

  await db.followUpFlag.createMany({
    data: [
      { analysisId: analysis2.id, studentName: "Maria", reason: "Described adding numerators and denominators directly without finding a common denominator." },
      { analysisId: analysis2.id, studentName: "Alex", reason: "Submitted a blank short-answer response and selected the incorrect option." },
      { analysisId: analysis2.id, studentName: "Marcus", reason: "Selected an incorrect answer and noted uncertainty about executing the LCD steps." },
    ],
  });

  console.log(`
Seeding complete!

Demo account:
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASSWORD}

Created:
  - 2 exit tickets (Main Idea Check, Adding Unlike Fractions)
  - 20 student submissions
  - 2 pre-built analyses with themes and follow-up flags
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
