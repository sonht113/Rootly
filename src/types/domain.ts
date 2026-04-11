export type AppRole = "student" | "teacher" | "admin";
export type RootLevel = "basic" | "intermediate" | "advanced";
export type UserRootPlanStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped"
  | "overdue";
export type UserRootPlanSource = "manual" | "teacher_suggested" | "auto";
export type UserRootReviewStatus = "pending" | "done" | "missed" | "rescheduled";
export type StudySessionType = "learn" | "review" | "quiz";
export type RankingMetric = "root_words_learned" | "words_learned" | "reviews_completed" | "streak";
export type RankingPeriod = "today" | "week" | "month" | "all";
export type RankingScope = "all" | "class";
export type RankingStatusTier = "novice" | "curator" | "polyglot";
export type QuizQuestionType = "multiple_choice" | "text";

export interface RankingActivityPoint {
  date: string;
  label: string;
  yourReviews: number;
  top10AverageReviews: number;
}

export interface RankingInsightData {
  currentUserRank: number | null;
  currentUserMetricValue: number;
  percentile: number;
  nextRank: number | null;
  nextRankMetricValue: number | null;
  pointsToNextRank: number;
  progressPercent: number;
  currentStreak: number;
  activityComparison: RankingActivityPoint[];
  tip: {
    title: string;
    body: string;
  };
}

export interface ProfileRow {
  id: string;
  auth_user_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface RootWordRow {
  id: string;
  root: string;
  meaning: string;
  description: string;
  level: RootLevel;
  tags: string[];
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordRow {
  id: string;
  root_word_id: string;
  word: string;
  part_of_speech: string;
  pronunciation: string | null;
  meaning_en: string;
  meaning_vi: string;
  created_at: string;
  updated_at: string;
}

export interface ExampleSentenceRow {
  id: string;
  word_id: string;
  english_sentence: string;
  vietnamese_sentence: string;
  usage_context: string | null;
  is_daily_usage: boolean;
  created_at: string;
  updated_at: string;
}

export interface RootWordDetail extends RootWordRow {
  words: Array<
    WordRow & {
      example_sentences: ExampleSentenceRow[];
    }
  >;
}

export interface RootWordQuizSetRow {
  id: string;
  root_word_id: string;
  question_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RootWordQuizQuestionRow {
  id: string;
  quiz_set_id: string;
  position: number;
  question_type: QuizQuestionType;
  prompt: string;
  correct_answer: string;
  explanation: string | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  created_at: string;
}

export interface RootWordQuizSetDetail extends RootWordQuizSetRow {
  questions: RootWordQuizQuestionRow[];
}

export interface RootWordQuizSummary {
  rootWordId: string;
  quizSetId: string | null;
  questionCount: number;
  hasQuiz: boolean;
}

export interface UserRootPlanRow {
  id: string;
  user_id: string;
  root_word_id: string;
  scheduled_date: string;
  status: UserRootPlanStatus;
  source: UserRootPlanSource;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRootReviewRow {
  id: string;
  user_id: string;
  root_word_id: string;
  review_date: string;
  review_step: number;
  status: UserRootReviewStatus;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySessionRow {
  id: string;
  user_id: string;
  root_word_id: string;
  session_type: StudySessionType;
  session_date: string;
  duration_minutes: number | null;
  result: Record<string, string | number | boolean | null> | null;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface RankingRow {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: AppRole;
  metric_value: number;
  root_words_learned: number;
  words_learned: number;
  reviews_completed: number;
  streak: number;
  is_current_user: boolean;
}

export interface TodayDashboardData {
  greetingName: string;
  streak: number;
  todayPlans: Array<
    UserRootPlanRow & {
      root_word: Pick<RootWordRow, "id" | "root" | "meaning" | "level"> & {
        word_count: number;
      };
    }
  >;
  todayReviews: Array<
    UserRootReviewRow & {
      root_word: Pick<RootWordRow, "id" | "root" | "meaning">;
    }
  >;
  overduePlans: Array<
    UserRootPlanRow & {
      root_word: Pick<RootWordRow, "id" | "root" | "meaning">;
    }
  >;
  summary: {
    totalLearnedRoots: number;
    totalReviewsThisWeek: number;
    totalWordsLearned: number;
  };
}

export interface ProgressSummaryData {
  totalRootWordsLearned: number;
  totalWordsLearned: number;
  totalReviewsCompleted: number;
  streak: number;
  completionRate: number;
  weeklyActivity: Array<{
    day: string;
    learned: number;
    reviewed: number;
  }>;
  masteredRoots: RootWordRow[];
}

export interface QuizQuestion {
  id: string;
  quizSetId: string;
  questionType: QuizQuestionType;
  prompt: string;
  options?: string[];
}

export interface QuizSubmissionAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
}
