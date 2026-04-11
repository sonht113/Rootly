import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().min(3, "Tên lớp quá ngắn"),
  description: z.string().max(400).optional().nullable(),
});

export const addMemberSchema = z.object({
  classId: z.string().uuid(),
  username: z.string().min(3),
});

export const suggestRootSchema = z.object({
  classId: z.string().uuid(),
  rootWordId: z.string().uuid(),
  suggestedDate: z.string().min(1),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SuggestRootInput = z.infer<typeof suggestRootSchema>;

