import { z } from "zod";

export const CLASS_LESSON_CSV_ACCEPT_ATTRIBUTE = ".csv,text/csv";
export const CLASS_LESSON_CSV_HEADERS = ["Word", "Meaning", "Synonyms", "Example Sentences"] as const;
export const CLASS_LESSON_CSV_LIST_SEPARATOR = "|";

function normalizeOptionalText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const normalizedOptionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => normalizeOptionalText(value));

export const createClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tên lớp quá ngắn")
    .max(120, "Tên lớp tối đa 120 ký tự"),
  description: normalizedOptionalTextSchema.refine(
    (value) => value === null || value.length <= 400,
    "Mô tả tối đa 400 ký tự",
  ),
});

export const addMemberSchema = z.object({
  classId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const searchClassMemberCandidatesSchema = z.object({
  classId: z.string().uuid(),
  query: z
    .string()
    .trim()
    .min(2, "Hãy nhập ít nhất 2 ký tự để tìm học viên")
    .max(120, "Chuỗi tìm kiếm tối đa 120 ký tự"),
});

export const suggestRootSchema = z.object({
  classId: z.string().uuid(),
  rootWordId: z.string().uuid(),
  suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày gợi ý không hợp lệ"),
});

export const acceptClassSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
});

export const removeClassMemberSchema = z.object({
  classId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const createClassLessonSchema = z.object({
  classId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(3, "Tiêu đề buổi học quá ngắn")
    .max(160, "Tiêu đề buổi học tối đa 160 ký tự"),
  description: normalizedOptionalTextSchema.refine(
    (value) => value === null || value.length <= 1000,
    "Mô tả buổi học tối đa 1000 ký tự",
  ),
});

export const deleteClassLessonSchema = z.object({
  classId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

export const uploadClassLessonVocabularySchema = z.object({
  classId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

const classLessonListValueSchema = z
  .array(z.string().trim().min(1, "Giá trị trong danh sách không được trống"));

export const classLessonVocabularyCsvRowSchema = z.object({
  word: z.string().trim().min(1, "Cột Word không được trống").max(120, "Word tối đa 120 ký tự"),
  meaning: z.string().trim().min(1, "Cột Meaning không được trống").max(500, "Meaning tối đa 500 ký tự"),
  synonyms: classLessonListValueSchema.min(1, "Cần ít nhất một từ đồng nghĩa trong cột Synonyms"),
  exampleSentences: classLessonListValueSchema.min(1, "Cần ít nhất một câu ví dụ trong cột Example Sentences"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SearchClassMemberCandidatesInput = z.infer<typeof searchClassMemberCandidatesSchema>;
export type SuggestRootInput = z.infer<typeof suggestRootSchema>;
export type AcceptClassSuggestionInput = z.infer<typeof acceptClassSuggestionSchema>;
export type RemoveClassMemberInput = z.infer<typeof removeClassMemberSchema>;
export type CreateClassLessonInput = z.infer<typeof createClassLessonSchema>;
export type DeleteClassLessonInput = z.infer<typeof deleteClassLessonSchema>;
export type UploadClassLessonVocabularyInput = z.infer<typeof uploadClassLessonVocabularySchema>;
export type ClassLessonVocabularyCsvRowInput = z.infer<typeof classLessonVocabularyCsvRowSchema>;
