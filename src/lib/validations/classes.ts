import { z } from "zod";

export const createClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tên lớp quá ngắn")
    .max(120, "Tên lớp tối đa 120 ký tự"),
  description: z
    .string()
    .trim()
    .max(400, "Mô tả tối đa 400 ký tự")
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
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
    .max(50, "Username tối đa 50 ký tự"),
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

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SearchClassMemberCandidatesInput = z.infer<typeof searchClassMemberCandidatesSchema>;
export type SuggestRootInput = z.infer<typeof suggestRootSchema>;
export type AcceptClassSuggestionInput = z.infer<typeof acceptClassSuggestionSchema>;
export type RemoveClassMemberInput = z.infer<typeof removeClassMemberSchema>;
