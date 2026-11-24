import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { loadStandards } from "./standards";
import { normalizeQuery } from "../src/lib/standards";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@signalslate.com";
const DEMO_PASSWORD = "demo1234";

// ─── Data shapes ─────────────────────────────────────────────────────────────

type StudentSeed = { first: string; last: string; pin?: string };

type PeriodSeed = { key: string; name: string; joinCode: string; students: string[] };

type QuestionSeed =
  | { prompt: string; type: "SHORT_ANSWER" }
  | { prompt: string; type: "MULTIPLE_CHOICE"; options: string[]; correct: number };

/** One answer per question: text for short answer, option index for multiple choice */
type Answer = string | number;

interface AnalysisSeed {
  summary: string;
  strengths: string[];
  misconceptions: string[];
  reteach: string;
  followup: string;
  themes: [string, "MISCONCEPTION" | "STRENGTH" | "GENERAL"][];
  /** Full student name → reason */
  flags: [string, string][];
}

interface TicketSeed {
  periods: string[];
  title: string;
  subject: string;
  lessonTopic: string;
  /** Codes as teachers write them, e.g. "CCSS.MATH.CONTENT.6.RP.A.1" or "NGSS 5-PS1-1" */
  standards?: string[];
  isOpen: boolean;
  daysAgo: number;
  questions: QuestionSeed[];
  /** Full student name → answers. Students left out didn't submit. */
  answers: Record<string, Answer[]>;
  analysis?: AnalysisSeed;
}

/** Links each code to the official Common Core or NGSS standard, or keeps it as custom text. */
async function standardTags(codes: string[]) {
  const tags = [];
  for (const [i, raw] of codes.entries()) {
    const framework = /^ngss/i.test(raw) ? "NGSS" : "Common Core";
    const match = await db.standard.findFirst({
      where: { framework, code: { equals: normalizeQuery(raw), mode: "insensitive" } },
      select: { id: true, code: true },
    });
    tags.push(match ? { standardId: match.id, code: match.code, orderIndex: i } : { code: raw, orderIndex: i });
  }
  return tags;
}

// ─── Students ────────────────────────────────────────────────────────────────

const STUDENTS: StudentSeed[] = [
  // Period 2
  { first: "Jordan", last: "Lee", pin: "4821" },
  { first: "Maria", last: "Gonzalez", pin: "3390" },
  { first: "Darius", last: "Brown", pin: "7712" },
  { first: "Priya", last: "Patel", pin: "1111" },
  { first: "Alex", last: "Kim", pin: "5068" },
  { first: "Sofia", last: "Rossi", pin: "2245" },
  { first: "Marcus", last: "Johnson", pin: "9130" },
  { first: "Emma", last: "Nguyen", pin: "6604" },
  { first: "Ethan", last: "Walker", pin: "8457" },
  { first: "Aisha", last: "Rahman", pin: "3029" },
  { first: "Noah", last: "Garcia", pin: "1976" },
  { first: "Lily", last: "Chen", pin: "5583" },
  // Period 3
  { first: "Mateo", last: "Silva", pin: "2222" },
  { first: "Chloe", last: "Martin" },
  { first: "Isaiah", last: "Davis" },
  { first: "Hannah", last: "Scott" },
  { first: "Kevin", last: "Tran" },
  { first: "Zoe", last: "Adams" },
  { first: "Omar", last: "Haddad" },
  { first: "Ava", last: "Thompson" },
  { first: "Lucas", last: "Wright" },
  { first: "Mia", last: "Lopez" },
  { first: "Elijah", last: "Moore" },
  // Period 5 (Mateo Silva is in both 3 and 5)
  { first: "Nora", last: "Bennett" },
  { first: "Caleb", last: "Price" },
  { first: "Leah", last: "Foster" },
  { first: "Ryan", last: "Ortiz" },
  { first: "Jasmine", last: "Reed" },
  { first: "Owen", last: "Hughes" },
  { first: "Sara", last: "Ali" },
  { first: "Diego", last: "Ramos" },
  { first: "Ella", last: "Fischer" },
];

const PERIODS: PeriodSeed[] = [
  {
    key: "p2",
    name: "Period 2",
    joinCode: "DEMO42",
    students: [
      "Jordan Lee", "Maria Gonzalez", "Darius Brown", "Priya Patel", "Alex Kim", "Sofia Rossi",
      "Marcus Johnson", "Emma Nguyen", "Ethan Walker", "Aisha Rahman", "Noah Garcia", "Lily Chen",
    ],
  },
  {
    key: "p3",
    name: "Period 3",
    joinCode: "DEMO43",
    students: [
      "Mateo Silva", "Chloe Martin", "Isaiah Davis", "Hannah Scott", "Kevin Tran", "Zoe Adams",
      "Omar Haddad", "Ava Thompson", "Lucas Wright", "Mia Lopez", "Elijah Moore",
    ],
  },
  {
    key: "p5",
    name: "Period 5",
    joinCode: "DEMO45",
    students: [
      "Mateo Silva", "Nora Bennett", "Caleb Price", "Leah Foster", "Ryan Ortiz", "Jasmine Reed",
      "Owen Hughes", "Sara Ali", "Diego Ramos", "Ella Fischer",
    ],
  },
];

// ─── Tickets ─────────────────────────────────────────────────────────────────

const TICKETS: TicketSeed[] = [
  // ── Period 2 ──────────────────────────────────────────────────────────────
  {
    periods: ["p2"],
    title: "Main Idea Check",
    subject: "ELA",
    lessonTopic: "Identifying main idea vs. supporting details",
    standards: ["CCSS.ELA-LITERACY.RI.5.2"],
    isOpen: false,
    daysAgo: 15,
    questions: [
      { prompt: "In your own words, what is the main idea of a passage?", type: "SHORT_ANSWER" },
      {
        prompt: "Which of the following best describes the main idea of the passage we read?",
        type: "MULTIPLE_CHOICE",
        options: [
          "The story is about a dog named Max.",
          "Friendship can help animals survive in the wild.",
          "Max likes to play in the snow.",
          "Animals need food and water.",
        ],
        correct: 1,
      },
    ],
    answers: {
      "Jordan Lee": ["The main idea is the most important thing the whole text is about", 1],
      "Maria Gonzalez": ["", 0],
      "Darius Brown": ["It's what the story is mostly about", 1],
      "Priya Patel": ["The main idea is like the big message of the whole passage", 1],
      "Alex Kim": ["I don't really get the difference between main idea and the details", 2],
      "Sofia Rossi": ["Main idea is the main thing happening", 1],
      "Marcus Johnson": ["It's the point the author is trying to make", 1],
      "Emma Nguyen": ["Main idea is what the text is all about but I wrote about the dog", 0],
      "Ethan Walker": ["The most important idea in the whole reading", 1],
      "Aisha Rahman": ["Main idea is what you learn from the whole text not just one part", 1],
      "Noah Garcia": ["I think it is about what happens in the beginning", 2],
      "Lily Chen": ["The central message or big idea", 1],
    },
    analysis: {
      summary:
        "Most students demonstrate a general understanding of main idea as the central message of a text. However, several students confused specific plot details with the main idea, and a few struggled to distinguish between what happens in a passage and what the passage is primarily about. Multiple-choice responses show that the most common distractor involved a surface-level detail about Max.",
      strengths: [
        "Several students articulated the main idea in their own words with accuracy.",
        "Most students selected the correct multiple-choice answer.",
      ],
      misconceptions: [
        "Some students confused a specific story detail (Max the dog) with the main idea.",
        "A few students described the beginning of the story rather than the overall main idea.",
        "One student explicitly noted confusion between main idea and supporting details.",
      ],
      reteach:
        "Use a two-column anchor chart: 'Main Idea' vs. 'Supporting Details.' Show one short paragraph and model sorting sentences into each column. Then have students practice with a partner using a new text.",
      followup:
        "Pick one sentence from the passage that supports the main idea. Explain why that sentence supports it rather than being the main idea itself.",
      themes: [
        ["main idea", "MISCONCEPTION"],
        ["supporting details", "MISCONCEPTION"],
        ["text evidence", "MISCONCEPTION"],
      ],
      flags: [
        ["Maria Gonzalez", "Submitted a blank short-answer response."],
        ["Alex Kim", "Explicitly stated confusion between main idea and details."],
        ["Emma Nguyen", "Short-answer describes the character detail rather than the main idea."],
        ["Noah Garcia", "Describes only the beginning of the story rather than the overall main idea."],
      ],
    },
  },
  {
    periods: ["p2"],
    title: "Using Text Evidence",
    subject: "ELA",
    lessonTopic: "Choosing and explaining text evidence to support a claim",
    standards: ["CCSS.ELA-LITERACY.RL.5.1"],
    isOpen: false,
    daysAgo: 9,
    questions: [
      {
        prompt: "Which sentence from the passage best shows that Max was brave? Copy it and explain your choice.",
        type: "SHORT_ANSWER",
      },
      {
        prompt: "What makes a piece of text evidence strong?",
        type: "MULTIPLE_CHOICE",
        options: [
          "It is the longest quote you can find",
          "It directly supports your claim",
          "It comes from the first paragraph",
          "It includes the character's name",
        ],
        correct: 1,
      },
    ],
    answers: {
      "Jordan Lee": ["\"Max ran back into the storm to find the pup.\" This shows he was brave because he put himself in danger to help.", 1],
      "Maria Gonzalez": ["Max was brave because he was a good dog.", 0],
      "Darius Brown": ["\"He didn't stop even when the wind knocked him down.\" He kept going even when it was hard.", 1],
      "Priya Patel": ["\"Max ran back into the storm to find the pup.\" He chose to go back even though he knew it was dangerous.", 1],
      "Alex Kim": ["I think he was brave the whole story.", 3],
      "Sofia Rossi": ["\"Max barked at the bear to protect the others.\" That is brave.", 1],
      "Marcus Johnson": ["\"He didn't stop even when the wind knocked him down.\"", 1],
      "Emma Nguyen": ["Max was brave because he saved the pup and he is a hero.", 2],
      "Ethan Walker": ["\"Max ran back into the storm\" proves he was brave because it was risky.", 1],
      "Aisha Rahman": ["\"Max barked at the bear to protect the others.\" He protected them even though he could get hurt.", 1],
      "Noah Garcia": ["The story said he was brave.", 0],
    },
    analysis: {
      summary:
        "About two thirds of the class quoted a relevant sentence and explained how it shows bravery. The rest either gave an opinion without quoting the text or quoted a sentence without explaining it. Most students recognized that strong evidence directly supports a claim.",
      strengths: [
        "Most students chose a sentence that clearly shows bravery.",
        "Several students explained the connection between the quote and the claim.",
      ],
      misconceptions: [
        "Several students stated an opinion about Max instead of quoting the text.",
        "Some students quoted evidence without explaining how it supports the claim.",
      ],
      reteach:
        "Model the 'quote, then because' sentence frame: \"[quote]\" shows ___ because ___. Practice with two quotes as a class, then have pairs write one together before trying it alone.",
      followup:
        "Find a different sentence that shows Max was loyal. Copy it and finish the sentence: This shows he was loyal because…",
      themes: [
        ["text evidence", "MISCONCEPTION"],
        ["explaining evidence", "MISCONCEPTION"],
        ["opinion vs evidence", "MISCONCEPTION"],
      ],
      flags: [
        ["Maria Gonzalez", "Gave an opinion instead of quoting the text and chose an incorrect option."],
        ["Alex Kim", "Did not cite a specific sentence from the passage."],
        ["Noah Garcia", "Referred to the story generally without quoting evidence."],
        ["Marcus Johnson", "Quoted strong evidence but did not explain how it supports the claim."],
      ],
    },
  },
  {
    periods: ["p2"],
    title: "Intro to Ratios",
    subject: "Math",
    lessonTopic: "Writing and interpreting ratios",
    standards: ["CCSS.MATH.CONTENT.6.RP.A.1", "CCSS.MATH.CONTENT.6.RP.A.3"],
    isOpen: false,
    daysAgo: 4,
    questions: [
      {
        prompt: "A bag has 3 red marbles and 5 blue marbles. What is the ratio of red to blue?",
        type: "MULTIPLE_CHOICE",
        options: ["5:3", "3:5", "3:8", "8:3"],
        correct: 1,
      },
      { prompt: "In your own words, what does a ratio tell you?", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Jordan Lee": [1, "It compares two amounts, like how many of one thing for each of another."],
      "Maria Gonzalez": [0, "It's the bigger number over the smaller one."],
      "Darius Brown": [1, "It compares two quantities."],
      "Priya Patel": [1, "A ratio shows how two amounts relate, like 3 red for every 5 blue."],
      "Alex Kim": [2, "It's a fraction of the total."],
      "Sofia Rossi": [1, "It compares parts to each other."],
      "Marcus Johnson": [1, "How many of something compared to something else."],
      "Emma Nguyen": [2, "A ratio is part out of the whole."],
      "Ethan Walker": [1, "Compares two numbers."],
      "Aisha Rahman": [1, "It tells you how much of one thing there is for every amount of another thing."],
      "Lily Chen": [3, "The total compared to one group."],
    },
    analysis: {
      summary:
        "Most students correctly wrote 3:5 and described a ratio as a comparison of two amounts. A group of students treated the ratio as part-to-whole (3:8), which suggests they are mixing up ratios and fractions. One student reversed the order of the quantities.",
      strengths: [
        "Most students wrote the part-to-part ratio in the correct order.",
        "Several explanations used 'for every' language accurately.",
      ],
      misconceptions: [
        "Some students wrote a part-to-whole ratio (3:8) instead of part-to-part.",
        "One student reversed the order of the quantities in the ratio.",
      ],
      reteach:
        "Use a tape diagram with red and blue sections. Ask three questions about the same picture: red to blue, blue to red, and red to total. Have students label which one is part-to-part and which is part-to-whole.",
      followup:
        "A class has 12 girls and 10 boys. Write the ratio of boys to girls, then the ratio of girls to all students. Which one is part-to-whole?",
      themes: [
        ["ratio reasoning", "MISCONCEPTION"],
        ["part to whole", "MISCONCEPTION"],
        ["fraction operations", "MISCONCEPTION"],
      ],
      flags: [
        ["Alex Kim", "Chose 3:8 and described a ratio as a fraction of the total."],
        ["Emma Nguyen", "Chose 3:8 and described a ratio as part out of the whole."],
        ["Maria Gonzalez", "Reversed the order of the ratio."],
        ["Lily Chen", "Chose 8:3, comparing the total to one group."],
      ],
    },
  },
  {
    periods: ["p2"],
    title: "Adding Unlike Fractions",
    subject: "Math",
    lessonTopic: "Adding fractions with unlike denominators",
    standards: ["CCSS.MATH.CONTENT.5.NF.A.1"],
    isOpen: true,
    daysAgo: 1,
    questions: [
      { prompt: "In your own words, describe how to add fractions with unlike denominators.", type: "SHORT_ANSWER" },
      {
        prompt: "What is 1/2 + 1/3?",
        type: "MULTIPLE_CHOICE",
        options: ["2/5", "5/6", "2/6", "3/5"],
        correct: 1,
      },
      { prompt: "What do you still find confusing about fractions?", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Jordan Lee": ["Find the least common denominator then convert both fractions", 1, "Nothing it makes sense now"],
      "Maria Gonzalez": ["You just add the tops and bottoms together", 0, "Why you can't just add across"],
      "Darius Brown": ["Get a common denominator and then add the numerators", 1, "I'm good"],
      "Alex Kim": ["", 0, "I don't understand why the denominators have to be the same"],
      "Sofia Rossi": ["First find LCD then make equivalent fractions then add tops", 1, "Nothing"],
      "Marcus Johnson": ["Find common denominator multiply both fractions and add", 2, "I understand the LCD part but not always sure I do it right"],
      "Emma Nguyen": ["Change both fractions to have the same bottom number then add the top numbers", 1, "Nothing really"],
      "Ethan Walker": ["LCD method convert add", 1, "Feels good"],
    },
    analysis: {
      summary:
        "Most students understand the process of finding a common denominator before adding fractions. Several students, however, still apply the incorrect strategy of adding numerators and denominators directly. Multiple-choice responses confirm that a portion of the class chose 2/5, suggesting they added across without finding a common denominator.",
      strengths: [
        "Most students correctly described the LCD process in their own words.",
        "Several students correctly computed 1/2 + 1/3 = 5/6.",
      ],
      misconceptions: [
        "Two students described adding numerators and denominators directly (e.g. 1/2 + 1/3 = 2/5).",
        "One student selected 2/6, suggesting they found a common denominator but did not convert both fractions before adding.",
      ],
      reteach:
        "Use fraction bars to show visually why 1/2 + 1/3 cannot equal 2/5. Demonstrate the equivalence steps: 1/2 = 3/6 and 1/3 = 2/6, then add.",
      followup: "If you add 1/4 + 2/3, what is the least common denominator? Show each step.",
      themes: [
        ["fraction operations", "MISCONCEPTION"],
        ["common denominator", "MISCONCEPTION"],
        ["equivalent fractions", "MISCONCEPTION"],
      ],
      flags: [
        ["Maria Gonzalez", "Described adding numerators and denominators directly without finding a common denominator."],
        ["Alex Kim", "Submitted a blank short-answer response and selected the incorrect option."],
        ["Marcus Johnson", "Selected an incorrect answer and noted uncertainty about executing the LCD steps."],
      ],
    },
  },

  // ── Period 3 ──────────────────────────────────────────────────────────────
  {
    periods: ["p3"],
    title: "States of Matter",
    subject: "Science",
    lessonTopic: "Particle model of solids, liquids, and gases",
    standards: ["NGSS 5-PS1-1"],
    isOpen: false,
    daysAgo: 11,
    questions: [
      {
        prompt: "What happens to the particles when ice melts into water?",
        type: "MULTIPLE_CHOICE",
        options: [
          "They get smaller",
          "They move faster and spread apart",
          "They stop moving",
          "They turn into air",
        ],
        correct: 1,
      },
      { prompt: "Give one example of a gas changing into a liquid in everyday life.", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Mateo Silva": [1, "Steam on a bathroom mirror turns into water drops."],
      "Chloe Martin": [1, "Water drops on the outside of a cold glass."],
      "Isaiah Davis": [0, "When water boils."],
      "Hannah Scott": [1, "Clouds turning into rain."],
      "Kevin Tran": [2, "Ice cream melting."],
      "Zoe Adams": [1, "My breath fogs up the window and turns into little drops."],
      "Omar Haddad": [1, "Condensation on a cold soda can."],
      "Ava Thompson": [0, "Water freezing into ice cubes."],
      "Lucas Wright": [1, "Steam from a pot turns back into water on the lid."],
      "Mia Lopez": [1, "Dew on the grass in the morning."],
      "Elijah Moore": [3, "Snow melting."],
    },
    analysis: {
      summary:
        "Most students correctly described particles moving faster and spreading apart as ice melts, and gave good everyday examples of condensation. A few students believe particles themselves change size, and several examples described melting, freezing, or boiling instead of a gas becoming a liquid.",
      strengths: [
        "Most students chose the correct particle description for melting.",
        "Many students gave strong condensation examples like a cold glass or a steamy mirror.",
      ],
      misconceptions: [
        "Some students think particles get smaller or stop moving when matter changes state.",
        "Several examples described a different change of state (melting, freezing, boiling) instead of condensation.",
      ],
      reteach:
        "Act it out: students are particles. Show solid (huddled, vibrating), liquid (sliding past each other), and gas (spread out, fast). Then sort picture cards of everyday changes into melting, freezing, evaporation, and condensation.",
      followup:
        "Why do water droplets form on the outside of a cold glass of lemonade? Explain using the word 'particles'.",
      themes: [
        ["particle model", "MISCONCEPTION"],
        ["condensation", "MISCONCEPTION"],
        ["states of matter", "MISCONCEPTION"],
      ],
      flags: [
        ["Isaiah Davis", "Chose 'particles get smaller' and gave boiling as a gas-to-liquid example."],
        ["Kevin Tran", "Chose 'particles stop moving' and described melting instead of condensation."],
        ["Ava Thompson", "Chose 'particles get smaller' and described freezing."],
        ["Elijah Moore", "Chose 'they turn into air' and described melting."],
      ],
    },
  },
  {
    periods: ["p3"],
    title: "Equivalent Fractions",
    subject: "Math",
    lessonTopic: "Generating and recognizing equivalent fractions",
    standards: ["CCSS.MATH.CONTENT.4.NF.A.1"],
    isOpen: false,
    daysAgo: 6,
    questions: [
      {
        prompt: "Which fraction is equivalent to 2/3?",
        type: "MULTIPLE_CHOICE",
        options: ["4/6", "3/4", "2/6", "4/5"],
        correct: 0,
      },
      { prompt: "How do you know when two fractions are equivalent?", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Mateo Silva": [0, "If you multiply the top and bottom by the same number you get the same amount."],
      "Chloe Martin": [0, "They show the same part of a whole."],
      "Isaiah Davis": [2, "They have the same top number."],
      "Hannah Scott": [0, "Multiply or divide the top and bottom by the same number."],
      "Kevin Tran": [1, "You add the same number to the top and the bottom."],
      "Zoe Adams": [0, "If you draw them, the shaded parts are the same size."],
      "Omar Haddad": [0, "They have the same value even if the numbers are different."],
      "Ava Thompson": [0, "Multiply both by 2."],
      "Lucas Wright": [3, "Add 2 to the top and bottom."],
      "Mia Lopez": [0, "They are the same amount of the whole."],
      "Elijah Moore": [2, "Same numerator."],
    },
    analysis: {
      summary:
        "Most of the class identified 4/6 and explained equivalence by multiplying the numerator and denominator by the same number or by comparing shaded models. Two students used additive thinking (adding the same number to top and bottom), and two believed fractions with the same numerator are equivalent.",
      strengths: [
        "Most students correctly identified 4/6 as equivalent to 2/3.",
        "Several students used visual models to justify equivalence.",
      ],
      misconceptions: [
        "Some students add the same number to the numerator and denominator instead of multiplying.",
        "Some students think fractions with the same numerator are equivalent.",
      ],
      reteach:
        "Fold paper strips into thirds and sixths and lay them side by side. Then test the 'add 2' rule: does 2/3 really equal 4/5? Shade both to show it doesn't.",
      followup: "Is 3/4 equivalent to 5/6? Prove your answer with a drawing or with multiplication.",
      themes: [
        ["equivalent fractions", "MISCONCEPTION"],
        ["additive reasoning", "MISCONCEPTION"],
        ["fraction operations", "MISCONCEPTION"],
      ],
      flags: [
        ["Kevin Tran", "Described adding the same number to the numerator and denominator."],
        ["Lucas Wright", "Described adding 2 to the top and bottom and chose 4/5."],
        ["Isaiah Davis", "Thinks fractions with the same numerator are equivalent."],
        ["Elijah Moore", "Chose 2/6 and explained equivalence as 'same numerator'."],
      ],
    },
  },
  {
    periods: ["p3"],
    title: "Character Motivation",
    subject: "ELA",
    lessonTopic: "Inferring why characters act the way they do",
    standards: ["CCSS.ELA-LITERACY.RL.5.3"],
    isOpen: false,
    daysAgo: 2,
    questions: [
      { prompt: "Why did Leo decide to enter the science fair? Use details from the story.", type: "SHORT_ANSWER" },
      {
        prompt: "What is a character's motivation?",
        type: "MULTIPLE_CHOICE",
        options: [
          "What the character looks like",
          "The reason behind a character's actions",
          "Where the story takes place",
          "The problem in the story",
        ],
        correct: 1,
      },
    ],
    answers: {
      "Mateo Silva": ["He wanted to prove to his brother he was smart, because his brother always teased him about his grades.", 1],
      "Chloe Martin": ["Leo wanted to win the prize money so he could fix his bike.", 1],
      "Isaiah Davis": ["He entered the science fair.", 3],
      "Hannah Scott": ["His teacher said he should try and he wanted to make her proud.", 1],
      "Kevin Tran": ["Leo likes science.", 0],
      "Zoe Adams": ["He wanted to prove he could finish something after he quit soccer.", 1],
      "Omar Haddad": ["To win.", 1],
      "Ava Thompson": ["Because his brother teased him so he wanted to show him.", 1],
      "Lucas Wright": ["He wanted to fix his bike with the prize money.", 1],
      "Mia Lopez": ["Leo wanted people to stop thinking he gives up on things, like when he quit soccer.", 1],
    },
    analysis: {
      summary:
        "Most students correctly defined motivation and identified a reason for Leo's choice, often citing his brother's teasing, the prize money, or quitting soccer. A few students retold what Leo did instead of why, or gave a reason without any details from the story.",
      strengths: [
        "Most students identified a reasonable motivation for Leo.",
        "Several students supported their answer with specific story details.",
      ],
      misconceptions: [
        "Some students retold an event instead of explaining the reason behind it.",
        "Some answers named a motivation without details from the text.",
      ],
      reteach:
        "Use a 'did / because' chart: in one column list what Leo did, in the other list why, with a quote for each 'why'. Model one row, then have pairs fill in two more.",
      followup:
        "At the end, Leo gives his trophy to his brother. Why do you think he did that? Use one detail from the story.",
      themes: [
        ["character motivation", "MISCONCEPTION"],
        ["text evidence", "MISCONCEPTION"],
        ["inference", "MISCONCEPTION"],
      ],
      flags: [
        ["Isaiah Davis", "Restated what Leo did rather than why, and chose 'the problem in the story'."],
        ["Kevin Tran", "Gave a general reason without story details and chose an incorrect definition."],
        ["Omar Haddad", "Very brief answer without supporting details."],
      ],
    },
  },
  {
    periods: ["p3", "p5"],
    title: "Decimal Place Value",
    subject: "Math",
    lessonTopic: "Comparing decimals to the hundredths",
    standards: ["CCSS.MATH.CONTENT.5.NBT.A.3"],
    isOpen: true,
    daysAgo: 0,
    questions: [
      {
        prompt: "Which number is greater: 0.5 or 0.45?",
        type: "MULTIPLE_CHOICE",
        options: ["0.45", "0.5", "They are equal"],
        correct: 1,
      },
      { prompt: "Explain how you decided.", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Mateo Silva": [1, "0.5 is the same as 0.50, and 50 hundredths is more than 45 hundredths."],
      "Chloe Martin": [1, "5 tenths is more than 4 tenths."],
      "Kevin Tran": [0, "45 is bigger than 5."],
      "Zoe Adams": [1, "I added a zero to make 0.50 and compared."],
      "Lucas Wright": [0, "0.45 has more digits so it's bigger."],
      // Period 5 had the same lesson later in the day
      "Nora Bennett": [0, "45 hundredths is more than 5 tenths because 45 is more than 5."],
      "Caleb Price": [0, "Longer decimals are bigger."],
      "Leah Foster": [1, "0.5 = 0.50 and 50 > 45."],
      "Ryan Ortiz": [0, "0.45 because it goes further."],
      "Jasmine Reed": [0, "I think 0.45 since 45 > 5."],
      "Owen Hughes": [2, "They are both about half."],
    },
  },

  // ── Period 5 ──────────────────────────────────────────────────────────────
  {
    periods: ["p5"],
    title: "The Water Cycle",
    subject: "Science",
    lessonTopic: "Evaporation, condensation, and precipitation",
    standards: ["NGSS 5-ESS2-1"],
    isOpen: false,
    daysAgo: 13,
    questions: [
      { prompt: "Describe what happens to a puddle on a hot, sunny day.", type: "SHORT_ANSWER" },
      {
        prompt: "Which step of the water cycle forms clouds?",
        type: "MULTIPLE_CHOICE",
        options: ["Evaporation", "Condensation", "Precipitation", "Collection"],
        correct: 1,
      },
    ],
    answers: {
      "Mateo Silva": ["The sun heats the water and it evaporates into water vapor.", 1],
      "Nora Bennett": ["It evaporates and goes up into the air as a gas.", 1],
      "Caleb Price": ["The ground soaks it up.", 0],
      "Leah Foster": ["The sun's heat turns it into water vapor that rises.", 1],
      "Ryan Ortiz": ["It dries up.", 0],
      "Jasmine Reed": ["Heat makes the water evaporate into a gas.", 1],
      "Owen Hughes": ["It goes into the clouds.", 2],
      "Sara Ali": ["The water evaporates because of the sun's energy.", 1],
      "Diego Ramos": ["It just disappears.", 0],
      "Ella Fischer": ["Evaporation turns the liquid water into water vapor.", 1],
    },
    analysis: {
      summary:
        "Most students described evaporation correctly and knew condensation forms clouds. A few students said the water 'disappears', 'dries up', or soaks into the ground, and several confused evaporation with condensation when asked how clouds form.",
      strengths: [
        "Most students used the word 'evaporate' and connected it to the sun's heat.",
        "Over half the class correctly chose condensation for cloud formation.",
      ],
      misconceptions: [
        "Some students think the water disappears or only soaks into the ground.",
        "Some students think evaporation, not condensation, forms clouds.",
      ],
      reteach:
        "Do the 'cloud in a jar' demo: hot water, a plate of ice on top, and watch condensation form. Label each part of the jar with the water cycle step it shows.",
      followup:
        "Where does the water from a puddle go, and how could that same water end up as rain? Use the words evaporation and condensation.",
      themes: [
        ["condensation", "MISCONCEPTION"],
        ["evaporation", "MISCONCEPTION"],
        ["water cycle", "MISCONCEPTION"],
      ],
      flags: [
        ["Caleb Price", "Said the ground soaks up the water and chose evaporation for cloud formation."],
        ["Ryan Ortiz", "Described the puddle as 'drying up' without naming evaporation; chose evaporation for clouds."],
        ["Diego Ramos", "Said the water 'disappears' and chose evaporation for clouds."],
      ],
    },
  },
  {
    periods: ["p5"],
    title: "Theme vs. Topic",
    subject: "ELA",
    lessonTopic: "Determining the theme of a story",
    standards: ["CCSS.ELA-LITERACY.RL.5.2"],
    isOpen: false,
    daysAgo: 5,
    questions: [
      {
        prompt: "Which of these is a theme, not a topic?",
        type: "MULTIPLE_CHOICE",
        options: ["Friendship", "Soccer", "True friends support you when things get hard", "A summer camp"],
        correct: 2,
      },
      { prompt: "What is the theme of 'The Long Walk Home'? Explain.", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Mateo Silva": [2, "Never give up, because the girl kept walking even when she was exhausted."],
      "Nora Bennett": [2, "Family is worth fighting for. She walked all night to get back to them."],
      "Caleb Price": [0, "Walking."],
      "Leah Foster": [2, "Being brave means doing hard things even when you're scared."],
      "Ryan Ortiz": [0, "Family."],
      "Jasmine Reed": [2, "Hard work pays off because she finally made it home."],
      "Owen Hughes": [1, "The story is about a girl walking home."],
      "Sara Ali": [2, "Don't give up on the people you love."],
      "Diego Ramos": [0, "Courage."],
      "Ella Fischer": [2, "Never give up. She kept going through the storm."],
    },
    analysis: {
      summary:
        "Most students identified a theme written as a full message and supported it with an event from the story. Several students gave a one-word topic (family, courage, walking) instead of a theme, and one student summarized the plot.",
      strengths: [
        "Most students wrote the theme as a complete sentence with a lesson.",
        "Several students linked the theme to a specific event in the story.",
      ],
      misconceptions: [
        "Some students named a one-word topic instead of a theme.",
        "One student summarized the plot instead of stating a lesson.",
      ],
      reteach:
        "Turn topics into themes: write 'family' on the board and ask, 'What does the story say about family?' Build a theme sentence together, then practice with 'courage' and 'friendship'.",
      followup: "The topic of a story is 'courage'. Write a theme sentence about courage that could fit 'The Long Walk Home'.",
      themes: [
        ["theme vs topic", "MISCONCEPTION"],
        ["main idea", "MISCONCEPTION"],
        ["summarizing", "MISCONCEPTION"],
      ],
      flags: [
        ["Caleb Price", "Gave a one-word topic ('walking') and chose 'Friendship' as a theme."],
        ["Ryan Ortiz", "Gave a one-word topic ('family') as the theme."],
        ["Diego Ramos", "Gave a one-word topic ('courage') as the theme."],
        ["Owen Hughes", "Summarized the plot instead of stating a theme."],
      ],
    },
  },
  {
    periods: ["p5"],
    title: "Multiplying Fractions",
    subject: "Math",
    lessonTopic: "Multiplying a fraction by a fraction",
    standards: ["CCSS.MATH.CONTENT.5.NF.B.4"],
    isOpen: false,
    daysAgo: 1,
    questions: [
      {
        prompt: "What is 2/3 × 3/4?",
        type: "MULTIPLE_CHOICE",
        options: ["6/12 = 1/2", "5/7", "6/7", "8/9"],
        correct: 0,
      },
      { prompt: "Why is the answer smaller than both fractions you started with?", type: "SHORT_ANSWER" },
    ],
    answers: {
      "Mateo Silva": [0, "Because you're taking a part of a part."],
      "Nora Bennett": [0, "Multiplying by a fraction less than 1 makes it smaller."],
      "Caleb Price": [1, "I don't know, multiplying should make it bigger."],
      "Leah Foster": [0, "You are finding 2/3 of 3/4, so it has to be less than 3/4."],
      "Ryan Ortiz": [1, "You add the tops and the bottoms."],
      "Jasmine Reed": [0, "Taking part of something gives you less than you started with."],
      "Owen Hughes": [0, "Because fractions are small."],
      "Sara Ali": [0, "It's a fraction of a fraction."],
      "Diego Ramos": [2, "Because the denominator got bigger."],
      "Ella Fischer": [0, "2/3 of 3/4 is less than 3/4."],
    },
    analysis: {
      summary:
        "Most students computed 2/3 × 3/4 correctly and several explained the result as 'a part of a part'. A few students still expect multiplication to make numbers bigger, and one student added numerators and denominators.",
      strengths: [
        "Most students got the correct product.",
        "Several students explained the answer as taking a fraction of a fraction.",
      ],
      misconceptions: [
        "Some students believe multiplying always makes a number bigger.",
        "One student added numerators and denominators instead of multiplying.",
      ],
      reteach:
        "Use an area model: shade 3/4 of a rectangle, then shade 2/3 of that shaded part in another color. Count the double-shaded pieces and compare to the whole.",
      followup: "Without calculating, is 3/5 × 7/8 more or less than 7/8? How do you know?",
      themes: [
        ["fraction operations", "MISCONCEPTION"],
        ["multiplication meaning", "MISCONCEPTION"],
        ["part of a part", "MISCONCEPTION"],
      ],
      flags: [
        ["Caleb Price", "Expects multiplication to make numbers bigger and chose an incorrect answer."],
        ["Ryan Ortiz", "Added numerators and denominators instead of multiplying."],
        ["Diego Ramos", "Chose an incorrect product and gave an unclear explanation."],
      ],
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Stable 4-digit PIN from a name, so reseeding keeps the same PINs */
function pinFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 10000;
  return String(h).padStart(4, "0");
}

const daysAgo = (days: number, minutes = 0) =>
  new Date(Date.now() - days * 86_400_000 + minutes * 60_000);

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  console.log("Standards loaded:", await loadStandards(db));

  // Keep the demo teacher's id stable so signed-in sessions survive a reseed
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Ms. Rivera", passwordHash },
    create: { name: "Ms. Rivera", email: DEMO_EMAIL, passwordHash },
  });
  await db.exitTicket.deleteMany({ where: { userId: user.id } });
  await db.classPeriod.deleteMany({ where: { userId: user.id } });
  await db.student.deleteMany({ where: { teacherId: user.id } });
  await db.trendsSummary.deleteMany({ where: { userId: user.id } });

  // Students
  const studentIds: Record<string, string> = {};
  for (const s of STUDENTS) {
    const name = `${s.first} ${s.last}`;
    const student = await db.student.create({
      data: { teacherId: user.id, firstName: s.first, lastName: s.last, pin: s.pin ?? pinFor(name) },
    });
    studentIds[name] = student.id;
  }

  // Periods + enrollments
  const periodIds: Record<string, string> = {};
  for (const [i, p] of PERIODS.entries()) {
    const period = await db.classPeriod.create({
      data: {
        userId: user.id,
        name: p.name,
        joinCode: p.joinCode,
        createdAt: daysAgo(30, i),
        enrollments: { create: p.students.map((name) => ({ studentId: studentIds[name] })) },
      },
    });
    periodIds[p.key] = period.id;
  }

  // Tickets, submissions, analyses
  let submissionCount = 0;
  for (const t of TICKETS) {
    const ticket = await db.exitTicket.create({
      data: {
        userId: user.id,
        title: t.title,
        subject: t.subject,
        lessonTopic: t.lessonTopic,
        isOpen: t.isOpen,
        createdAt: daysAgo(t.daysAgo, -60),
        periods: { connect: t.periods.map((k) => ({ id: periodIds[k] })) },
        standards: { create: await standardTags(t.standards ?? []) },
      },
    });

    const questions = [];
    for (const [qi, q] of t.questions.entries()) {
      const question = await db.question.create({
        data: { exitTicketId: ticket.id, prompt: q.prompt, questionType: q.type, orderIndex: qi },
      });
      const optionIds: string[] = [];
      if (q.type === "MULTIPLE_CHOICE") {
        for (const [oi, text] of q.options.entries()) {
          const option = await db.questionOption.create({
            data: { questionId: question.id, optionText: text, orderIndex: oi, isCorrect: oi === q.correct ? true : null },
          });
          optionIds.push(option.id);
        }
      }
      questions.push({ id: question.id, type: q.type, optionIds });
    }

    for (const [si, [name, answers]] of Object.entries(t.answers).entries()) {
      const studentId = studentIds[name];
      if (!studentId) throw new Error(`Unknown student in "${t.title}": ${name}`);
      const submission = await db.submission.create({
        data: {
          exitTicketId: ticket.id,
          studentId,
          studentName: name,
          submittedAt: daysAgo(t.daysAgo, -45 + si * 2),
        },
      });
      await db.response.createMany({
        data: questions.map((q, qi) => {
          const a = answers[qi];
          return q.type === "SHORT_ANSWER"
            ? { submissionId: submission.id, questionId: q.id, answerText: (a as string) || null, selectedOptionId: null }
            : { submissionId: submission.id, questionId: q.id, answerText: null, selectedOptionId: q.optionIds[a as number] };
        }),
      });
      submissionCount++;
    }

    if (t.analysis) {
      const a = t.analysis;
      await db.analysis.create({
        data: {
          exitTicketId: ticket.id,
          overallSummary: a.summary,
          strengthsText: a.strengths.join("\n"),
          misconceptionsText: a.misconceptions.join("\n"),
          reteachSuggestion: a.reteach,
          followupQuestion: a.followup,
          createdAt: daysAgo(t.daysAgo, 0),
          rawJson: {
            overall_summary: a.summary,
            strengths: a.strengths,
            misconceptions: a.misconceptions,
            students_to_check_in_with: a.flags.map(([student_name, reason]) => ({ student_name, reason })),
            reteach_suggestion: a.reteach,
            followup_question: a.followup,
            theme_tags: a.themes.map(([name]) => name),
          },
          themes: { create: a.themes.map(([themeName, themeType]) => ({ themeName, themeType })) },
          followUpFlags: {
            create: a.flags.map(([name, reason]) => ({
              studentId: studentIds[name],
              studentName: name,
              reason,
              createdAt: daysAgo(t.daysAgo, 0),
            })),
          },
        },
      });
    }
  }

  const priya = STUDENTS.find((s) => s.first === "Priya")!;
  const mateo = STUDENTS.find((s) => s.first === "Mateo")!;
  console.log(`
Seeding complete!

Teacher (/login):
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASSWORD}

Students (/student/login):
${PERIODS.map((p) => `  ${p.name}: class code ${p.joinCode}, ${p.students.length} students`).join("\n")}
  Try Priya Patel (DEMO42, PIN ${priya.pin}): has an open ticket to answer
  Try Mateo Silva (DEMO43 or DEMO45, PIN ${mateo.pin}): in two periods

Created:
  - ${STUDENTS.length} students in ${PERIODS.length} periods
  - ${TICKETS.length} exit tickets (${TICKETS.filter((t) => t.isOpen).length} open)
  - ${submissionCount} submissions
  - ${TICKETS.filter((t) => t.analysis).length} pre-built analyses with themes and follow-up flags
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
