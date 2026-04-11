import { z } from "zod";

const multipleChoiceQuestionSchema = z.object({
  question_type: z.literal("multiple_choice"),
  prompt: z.string().trim().min(3),
  correct_answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).nullable().optional(),
  option_a: z.string().trim().min(1),
  option_b: z.string().trim().min(1),
  option_c: z.string().trim().min(1),
  option_d: z.string().trim().min(1),
});

const textQuestionSchema = z.object({
  question_type: z.literal("text"),
  prompt: z.string().trim().min(3),
  correct_answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1).nullable().optional(),
  option_a: z.null().optional(),
  option_b: z.null().optional(),
  option_c: z.null().optional(),
  option_d: z.null().optional(),
});

export const rootWordQuizQuestionSchema = z
  .discriminatedUnion("question_type", [multipleChoiceQuestionSchema, textQuestionSchema])
  .superRefine((value, context) => {
    if (value.question_type !== "multiple_choice") {
      return;
    }

    const options = [value.option_a, value.option_b, value.option_c, value.option_d];
    if (!options.includes(value.correct_answer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Correct Answer must match one of the provided options for multiple_choice questions.",
      });
    }
  });

export const rootWordQuizImportCommitSchema = z.object({
  rootWordId: z.string().uuid(),
  questions: z.array(rootWordQuizQuestionSchema).min(1).max(20),
});

export const rootWordQuizSubmissionAnswerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string(),
});

export const rootWordQuizSubmissionSchema = z.object({
  rootWordId: z.string().uuid(),
  quizSetId: z.string().uuid(),
  answers: z.array(rootWordQuizSubmissionAnswerSchema).min(1).max(20),
});

export type RootWordQuizQuestionInput = z.infer<typeof rootWordQuizQuestionSchema>;
export type RootWordQuizImportCommitInput = z.infer<typeof rootWordQuizImportCommitSchema>;
export type RootWordQuizSubmissionInput = z.infer<typeof rootWordQuizSubmissionSchema>;
