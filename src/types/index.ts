export interface AnalysisResult {
  overall_summary: string;
  strengths: string[];
  misconceptions: string[];
  students_to_check_in_with: Array<{
    student_name: string;
    reason: string;
  }>;
  reteach_suggestion: string;
  followup_question: string;
  theme_tags: string[];
}

export interface TicketWithCounts {
  id: string;
  title: string;
  subject: string;
  lessonTopic: string;
  isOpen: boolean;
  createdAt: Date;
  _count: { submissions: number; analyses: number };
}

export interface QuestionWithOptions {
  id: string;
  prompt: string;
  questionType: "SHORT_ANSWER" | "MULTIPLE_CHOICE";
  orderIndex: number;
  options: Array<{
    id: string;
    optionText: string;
    orderIndex: number;
    isCorrect: boolean | null;
  }>;
}

export interface SubmissionWithResponses {
  id: string;
  studentName: string;
  submittedAt: Date;
  responses: Array<{
    id: string;
    questionId: string;
    answerText: string | null;
    selectedOptionId: string | null;
    selectedOption: { optionText: string } | null;
  }>;
}

export interface AnalysisWithDetails {
  id: string;
  overallSummary: string;
  strengthsText: string;
  misconceptionsText: string;
  reteachSuggestion: string;
  followupQuestion: string;
  createdAt: Date;
  themes: Array<{ themeName: string; themeType: string }>;
  followUpFlags: Array<{ studentName: string; reason: string }>;
}
