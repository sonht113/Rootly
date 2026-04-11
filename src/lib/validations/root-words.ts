import { z } from "zod";

export const exampleSentenceSchema = z.object({
  english_sentence: z.string().min(3),
  vietnamese_sentence: z.string().min(3),
  usage_context: z.string().optional().nullable(),
  is_daily_usage: z.boolean().default(true),
});

export const wordSchema = z.object({
  id: z.string().uuid().optional(),
  word: z.string().min(2),
  part_of_speech: z.string().min(2),
  pronunciation: z.string().optional().nullable(),
  meaning_en: z.string().min(2),
  meaning_vi: z.string().min(2),
  example_sentences: z.array(exampleSentenceSchema).min(1),
});

export const rootWordSchema = z.object({
  id: z.string().uuid().optional(),
  root: z.string().min(2),
  meaning: z.string().min(2),
  description: z.string().min(10),
  level: z.enum(["basic", "intermediate", "advanced"]),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(false),
  words: z.array(wordSchema).min(1),
});

export type RootWordInput = z.infer<typeof rootWordSchema>;
export type WordInput = z.infer<typeof wordSchema>;
export type ExampleSentenceInput = z.infer<typeof exampleSentenceSchema>;

