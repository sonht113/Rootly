function normalizeQuizAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isQuizAnswerCorrect(userAnswer: string, correctAnswer: string) {
  return normalizeQuizAnswer(userAnswer) === normalizeQuizAnswer(correctAnswer);
}
