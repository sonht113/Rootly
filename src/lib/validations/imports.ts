import { z } from "zod";

export const importRowSchema = z.object({
  root: z.string().min(2),
  meaning: z.string().min(2),
  description: z.string().min(10),
  level: z.enum(["basic", "intermediate", "advanced"]),
  tags: z.array(z.string()).default([]),
  word: z.string().min(2),
  part_of_speech: z.string().min(2),
  pronunciation: z.string().nullable().optional(),
  meaning_en: z.string().min(2),
  meaning_vi: z.string().min(2),
  english_sentence: z.string().min(3),
  vietnamese_sentence: z.string().min(3),
  usage_context: z.string().nullable().optional(),
  is_daily_usage: z.boolean().default(true),
  is_published: z.boolean().default(false),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;

export const rootsCsvImportRowSchema = z.object({
  root: z.string().min(2),
  meaning: z.string().min(2),
  word_list: z.array(z.string().min(2)).min(1),
  examples: z.array(z.string().min(3)).min(1),
  pronunciation: z.string().nullable().optional(),
});

export type RootsCsvImportRowInput = z.infer<typeof rootsCsvImportRowSchema>;
