import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { quizSubmissionSchema } from "@/lib/validations/quiz";
import { getQuizSetForSubmission } from "@/server/repositories/root-word-quizzes-repository";
import { syncQuizCompletionForRootWord } from "@/server/repositories/study-repository";
import { isQuizAnswerCorrect, scoreQuizAnswers } from "@/server/services/quiz-service";

export async function POST(request: Request) {
  const payload = quizSubmissionSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Dữ liệu quiz chưa hợp lệ.",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Bạn cần đăng nhập để nộp bài quiz." }, { status: 401 });
  }

  const quizSet = await getQuizSetForSubmission(payload.data.rootWordId, payload.data.quizSetId);
  if (!quizSet) {
    return NextResponse.json({ message: "Không tìm thấy bộ quiz cho từ gốc này." }, { status: 404 });
  }

  const questionIds = quizSet.questions.map((question) => question.id);
  const submittedQuestionIds = payload.data.answers.map((answer) => answer.questionId);
  const uniqueSubmittedQuestionIds = new Set(submittedQuestionIds);

  if (
    payload.data.answers.length !== quizSet.questions.length ||
    uniqueSubmittedQuestionIds.size !== submittedQuestionIds.length ||
    questionIds.some((questionId) => !uniqueSubmittedQuestionIds.has(questionId))
  ) {
    return NextResponse.json({ message: "Bộ câu trả lời không khớp với quiz hiện tại." }, { status: 400 });
  }

  const answersByQuestionId = new Map(payload.data.answers.map((answer) => [answer.questionId, answer.userAnswer]));
  const gradedAnswers = quizSet.questions.map((question) => {
    const userAnswer = answersByQuestionId.get(question.id) ?? "";

    return {
      questionId: question.id,
      userAnswer,
      isCorrect: isQuizAnswerCorrect(userAnswer, question.correct_answer),
    };
  });

  const score = scoreQuizAnswers(gradedAnswers);

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      root_word_id: payload.data.rootWordId,
      quiz_set_id: quizSet.id,
      score: score.score,
      total_questions: score.totalQuestions,
      correct_answers: score.correctAnswers,
    })
    .select()
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ message: attemptError?.message ?? "Không thể lưu kết quả quiz." }, { status: 500 });
  }

  const answersPayload = quizSet.questions.map((question) => {
    const userAnswer = answersByQuestionId.get(question.id) ?? "";

    return {
      quiz_attempt_id: attempt.id,
      quiz_question_id: question.id,
      question_type: question.question_type,
      prompt: question.prompt,
      user_answer: userAnswer,
      correct_answer: question.correct_answer,
      is_correct: isQuizAnswerCorrect(userAnswer, question.correct_answer),
    };
  });

  const { error: answersError } = await supabase.from("quiz_answers").insert(answersPayload);
  if (answersError) {
    return NextResponse.json({ message: answersError.message }, { status: 500 });
  }

  let completedLearningPlan = false;
  let reviewCycleCreated = false;
  let learningPlanSyncError: string | null = null;

  try {
    const completionResult = await syncQuizCompletionForRootWord(payload.data.rootWordId);
    completedLearningPlan = completionResult.completedLearningPlan;
    reviewCycleCreated = completionResult.reviewCycleCreated;

    revalidatePath("/library");
    revalidatePath(`/library/${payload.data.rootWordId}`);
    revalidatePath("/roots");
    revalidatePath(`/roots/${payload.data.rootWordId}`);

    if (completionResult.completedLearningPlan || completionResult.reviewCycleCreated) {
      revalidatePath("/calendar");
      revalidatePath("/today");
      revalidatePath("/progress");
      revalidatePath("/reviews");
    }
  } catch (error) {
    learningPlanSyncError = error instanceof Error ? error.message : "Không thể đồng bộ trạng thái học của từ gốc.";
    console.error("Failed to complete active study plan after quiz submission", error);
  }

  return NextResponse.json({
    attemptId: attempt.id,
    completedLearningPlan,
    reviewCycleCreated,
    learningPlanSyncError,
    ...score,
  });
}
