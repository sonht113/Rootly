import { z } from "zod";

export const EXAM_MAX_QUESTION_COUNT = 50;
export const EXAM_MIN_QUESTION_POINTS = 1;
export const EXAM_MAX_QUESTION_POINTS = 20;
export const EXAM_QUESTION_BANK_IMPORT_HEADERS = [
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "Explanation",
] as const;

const nullableTrimmedText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

const nullableDateTimeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  })
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), "Thời điểm không hợp lệ");

const nullableIntegerSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const normalized = value.trim();
    if (normalized.length === 0) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine(
    (value) => value === null || (Number.isInteger(value) && value >= 5 && value <= 180),
    "Thời lượng phải nằm trong khoảng 5-180 phút",
  );

export const examMultipleChoiceQuestionBankItemSchema = z.object({
  question_type: z.literal("multiple_choice"),
  prompt: z.string().trim().min(6, "Câu hỏi quá ngắn").max(500, "Câu hỏi tối đa 500 ký tự"),
  correct_answer: z.string().trim().min(1, "Chọn đáp án đúng"),
  explanation: nullableTrimmedText(400),
  option_a: z.string().trim().min(1, "Thiếu đáp án A").max(200, "Mỗi đáp án tối đa 200 ký tự"),
  option_b: z.string().trim().min(1, "Thiếu đáp án B").max(200, "Mỗi đáp án tối đa 200 ký tự"),
  option_c: z.string().trim().min(1, "Thiếu đáp án C").max(200, "Mỗi đáp án tối đa 200 ký tự"),
  option_d: z.string().trim().min(1, "Thiếu đáp án D").max(200, "Mỗi đáp án tối đa 200 ký tự"),
});

const textQuestionBankItemSchema = z.object({
  question_type: z.literal("text"),
  prompt: z.string().trim().min(6, "Câu hỏi quá ngắn").max(500, "Câu hỏi tối đa 500 ký tự"),
  correct_answer: z.string().trim().min(1, "Cần có đáp án đúng").max(200, "Đáp án tối đa 200 ký tự"),
  explanation: nullableTrimmedText(400),
  option_a: z.null().optional(),
  option_b: z.null().optional(),
  option_c: z.null().optional(),
  option_d: z.null().optional(),
});

export const examQuestionBankItemSchema = z
  .discriminatedUnion("question_type", [examMultipleChoiceQuestionBankItemSchema, textQuestionBankItemSchema])
  .superRefine((value, context) => {
    if (value.question_type !== "multiple_choice") {
      return;
    }

    const options = [value.option_a, value.option_b, value.option_c, value.option_d];
    if (!options.includes(value.correct_answer)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Đáp án đúng phải trùng với một trong bốn lựa chọn.",
        path: ["correct_answer"],
      });
    }
  });

const examQuestionBankAnswerCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value): value is "A" | "B" | "C" | "D" => ["A", "B", "C", "D"].includes(value), {
    message: "Correct Answer phải là A, B, C hoặc D.",
  });

export const examQuestionBankImportQuestionSchema = examMultipleChoiceQuestionBankItemSchema;

export const examQuestionBankImportCsvRowSchema = z
  .object({
    prompt: z.string().trim().min(6, "Câu hỏi quá ngắn").max(500, "Câu hỏi tối đa 500 ký tự"),
    explanation: nullableTrimmedText(400),
    option_a: z.string().trim().min(1, "Thiếu đáp án A").max(200, "Mỗi đáp án tối đa 200 ký tự"),
    option_b: z.string().trim().min(1, "Thiếu đáp án B").max(200, "Mỗi đáp án tối đa 200 ký tự"),
    option_c: z.string().trim().min(1, "Thiếu đáp án C").max(200, "Mỗi đáp án tối đa 200 ký tự"),
    option_d: z.string().trim().min(1, "Thiếu đáp án D").max(200, "Mỗi đáp án tối đa 200 ký tự"),
    correct_answer_code: examQuestionBankAnswerCodeSchema,
  })
  .transform((value) => {
    const answerByCode = {
      A: value.option_a,
      B: value.option_b,
      C: value.option_c,
      D: value.option_d,
    } as const;

    const normalized = {
      question_type: "multiple_choice" as const,
      prompt: value.prompt,
      correct_answer: answerByCode[value.correct_answer_code],
      explanation: value.explanation ?? null,
      option_a: value.option_a,
      option_b: value.option_b,
      option_c: value.option_c,
      option_d: value.option_d,
    };

    return normalized;
  });

export const deleteQuestionBankItemSchema = z.object({
  itemId: z.string().uuid(),
});

export const createExamSchema = z
  .object({
    title: z.string().trim().min(3, "Tên kỳ thi quá ngắn").max(120, "Tên kỳ thi tối đa 120 ký tự"),
    description: nullableTrimmedText(400),
    scope: z.enum(["class", "global"]),
    classId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value && value.length > 0 ? value : null)),
    startsAt: nullableDateTimeSchema,
    endsAt: nullableDateTimeSchema,
    durationMinutes: nullableIntegerSchema,
  })
  .superRefine((value, context) => {
    if (value.scope === "class" && !value.classId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kỳ thi lớp học cần chọn lớp áp dụng.",
        path: ["classId"],
      });
    }

    if (value.scope === "global" && value.classId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kỳ thi toàn hệ thống không dùng lớp cụ thể.",
        path: ["classId"],
      });
    }

    if (value.startsAt && value.endsAt && new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
        path: ["endsAt"],
      });
    }
  });

export const updateExamSchema = createExamSchema.extend({
  examId: z.string().uuid(),
});

export const deleteExamSchema = z.object({
  examId: z.string().uuid(),
});

export const syncExamQuestionsSchema = z.object({
  examId: z.string().uuid(),
  questions: z
    .array(
      z.object({
        questionBankItemId: z.string().uuid(),
        points: z
          .number()
          .int()
          .min(EXAM_MIN_QUESTION_POINTS, "Điểm mỗi câu phải từ 1 trở lên")
          .max(EXAM_MAX_QUESTION_POINTS, "Điểm mỗi câu tối đa 20"),
      }),
    )
    .min(1, "Kỳ thi cần ít nhất một câu hỏi")
    .max(EXAM_MAX_QUESTION_COUNT, "Kỳ thi tối đa 50 câu hỏi"),
});

export const examQuestionBankImportCommitSchema = z.object({
  examId: z.string().uuid().optional().nullable(),
  selectedQuestionCount: z.number().int().min(0).max(EXAM_MAX_QUESTION_COUNT).default(0),
  questions: z.array(examQuestionBankImportQuestionSchema).min(1, "Tệp import cần ít nhất một câu hỏi."),
});

export const changeExamStatusSchema = z.object({
  examId: z.string().uuid(),
});

export const startExamAttemptSchema = z.object({
  examId: z.string().uuid(),
});

export const examSubmissionAnswerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string().max(2000, "Câu trả lời quá dài"),
});

export const examAttemptDraftSaveSchema = z.object({
  answers: z.array(examSubmissionAnswerSchema).max(EXAM_MAX_QUESTION_COUNT),
});

export const examAttemptSubmissionSchema = z.object({
  answers: z.array(examSubmissionAnswerSchema).min(1).max(EXAM_MAX_QUESTION_COUNT),
});

export type ExamQuestionBankItemInput = z.infer<typeof examQuestionBankItemSchema>;
export type ExamQuestionBankImportQuestionInput = z.infer<typeof examQuestionBankImportQuestionSchema>;
export type ExamQuestionBankImportCommitInput = z.infer<typeof examQuestionBankImportCommitSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type SyncExamQuestionsInput = z.infer<typeof syncExamQuestionsSchema>;
export type ExamAttemptDraftSaveInput = z.infer<typeof examAttemptDraftSaveSchema>;
export type ExamAttemptSubmissionInput = z.infer<typeof examAttemptSubmissionSchema>;
