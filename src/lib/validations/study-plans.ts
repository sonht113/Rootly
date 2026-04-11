import { z } from "zod";

export const schedulePlanSchema = z.object({
  rootWordId: z.string().uuid(),
  scheduledDate: z.string().min(1),
  source: z.enum(["manual", "teacher_suggested", "auto"]).default("manual"),
});

export const updatePlanSchema = schedulePlanSchema.extend({
  id: z.string().uuid(),
});

export const reviewAnswerSchema = z.object({
  reviewId: z.string().uuid(),
  remembered: z.boolean(),
});

export type SchedulePlanInput = z.infer<typeof schedulePlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ReviewAnswerInput = z.infer<typeof reviewAnswerSchema>;

