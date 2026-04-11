import { percent } from "@/lib/utils/numbers";
import type { QuizQuestion, QuizSubmissionAnswer, RootWordQuizSetDetail } from "@/types/domain";

function normalizeQuizAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildQuizQuestions(quizSet: RootWordQuizSetDetail): QuizQuestion[] {
  return quizSet.questions.map((question) => ({
    id: question.id,
    quizSetId: quizSet.id,
    questionType: question.question_type,
    prompt: question.prompt,
    options:
      question.question_type === "multiple_choice"
        ? [question.option_a, question.option_b, question.option_c, question.option_d].filter(
            (option): option is string => Boolean(option),
          )
        : undefined,
  }));
}

export function isQuizAnswerCorrect(userAnswer: string, correctAnswer: string) {
  return normalizeQuizAnswer(userAnswer) === normalizeQuizAnswer(correctAnswer);
}

export function scoreQuizAnswers(answers: QuizSubmissionAnswer[]) {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  return {
    correctAnswers,
    totalQuestions: answers.length,
    score: percent(correctAnswers, answers.length),
  };
}
