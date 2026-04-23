import * as XLSX from "xlsx";

import {
  importRowSchema,
  rootsCsvImportRowSchema,
  type ImportRowInput,
  type RootsCsvImportRowInput,
} from "@/lib/validations/imports";
import { rootWordSchema, type RootWordInput } from "@/lib/validations/root-words";

export type ImportParseMode = "detailed" | "roots";

const ROOTS_CSV_HEADERS = [
  "Root Word",
  "Meaning",
  "Word List",
  "Examples",
  "Pronunciation",
] as const;

const ROOTS_CSV_LIST_SEPARATOR = "|";
const ROOTS_CSV_BILINGUAL_SEPARATOR = "=>";
const ROOTS_CSV_DEFAULT_LEVEL: RootWordInput["level"] = "basic";

function readWorkbook(buffer: Buffer, fileName: string) {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const csv = buffer.toString("utf8").replace(/^\uFEFF/, "");

    return XLSX.read(csv, {
      type: "string",
      FS: ",",
      PRN: false,
    });
  }

  return XLSX.read(buffer, { type: "buffer" });
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  }

  return false;
}

function normalizeDetailedRow(row: Record<string, unknown>): ImportRowInput {
  return importRowSchema.parse({
    root: String(row.root ?? ""),
    meaning: String(row.meaning ?? ""),
    description: String(row.description ?? ""),
    level: String(row.level ?? "basic"),
    tags:
      typeof row.tags === "string"
        ? row.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : Array.isArray(row.tags)
          ? row.tags.map((tag) => String(tag))
          : [],
    word: String(row.word ?? ""),
    part_of_speech: String(row.part_of_speech ?? ""),
    pronunciation: row.pronunciation ? String(row.pronunciation) : null,
    meaning_en: String(row.meaning_en ?? ""),
    meaning_vi: String(row.meaning_vi ?? ""),
    english_sentence: String(row.english_sentence ?? ""),
    vietnamese_sentence: String(row.vietnamese_sentence ?? ""),
    usage_context: row.usage_context ? String(row.usage_context) : null,
    is_daily_usage: normalizeBoolean(row.is_daily_usage ?? true),
    is_published: normalizeBoolean(row.is_published ?? false),
  });
}

function groupDetailedRows(rows: ImportRowInput[]) {
  const grouped = new Map<string, RootWordInput>();

  rows.forEach((row) => {
    const key = row.root.toLowerCase();
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        root: row.root,
        meaning: row.meaning,
        description: row.description,
        level: row.level,
        tags: row.tags,
        is_published: row.is_published,
        words: [
          {
            word: row.word,
            part_of_speech: row.part_of_speech,
            pronunciation: row.pronunciation ?? null,
            meaning_en: row.meaning_en,
            meaning_vi: row.meaning_vi,
            example_sentences: [
              {
                english_sentence: row.english_sentence,
                vietnamese_sentence: row.vietnamese_sentence,
                usage_context: row.usage_context ?? null,
                is_daily_usage: row.is_daily_usage,
              },
            ],
          },
        ],
      });
      return;
    }

    const wordKey = row.word.toLowerCase();
    const existingWord = existing.words.find((word) => word.word.toLowerCase() === wordKey);

    if (!existingWord) {
      existing.words.push({
        word: row.word,
        part_of_speech: row.part_of_speech,
        pronunciation: row.pronunciation ?? null,
        meaning_en: row.meaning_en,
        meaning_vi: row.meaning_vi,
        example_sentences: [
          {
            english_sentence: row.english_sentence,
            vietnamese_sentence: row.vietnamese_sentence,
            usage_context: row.usage_context ?? null,
            is_daily_usage: row.is_daily_usage,
          },
        ],
      });
      return;
    }

    existingWord.example_sentences.push({
      english_sentence: row.english_sentence,
      vietnamese_sentence: row.vietnamese_sentence,
      usage_context: row.usage_context ?? null,
      is_daily_usage: row.is_daily_usage,
    });
  });

  return Array.from(grouped.values()).map((groupedRoot) => rootWordSchema.parse(groupedRoot));
}

function splitRootsCsvCell(value: string) {
  return value
    .split(ROOTS_CSV_LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitBilingualValue(value: string) {
  const normalizedValue = value.trim();
  const separatorIndex = normalizedValue.indexOf(ROOTS_CSV_BILINGUAL_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      primaryValue: normalizedValue,
      secondaryValue: null,
    };
  }

  return {
    primaryValue: normalizedValue.slice(0, separatorIndex).trim(),
    secondaryValue: normalizedValue.slice(separatorIndex + ROOTS_CSV_BILINGUAL_SEPARATOR.length).trim() || null,
  };
}

function normalizeRootsCsvRow(row: Record<string, unknown>) {
  return rootsCsvImportRowSchema.safeParse({
    root: String(row["Root Word"] ?? "").trim(),
    meaning: String(row.Meaning ?? "").trim(),
    word_list: splitRootsCsvCell(String(row["Word List"] ?? "")),
    examples: splitRootsCsvCell(String(row.Examples ?? "")),
    pronunciation: row.Pronunciation ? String(row.Pronunciation).trim() : null,
  });
}

function parseRootsCsvMeaning(meaning: string) {
  const { primaryValue, secondaryValue } = splitBilingualValue(meaning);
  const meaningEn = primaryValue || secondaryValue || meaning.trim();
  const meaningVi = secondaryValue || primaryValue || meaning.trim();

  return {
    rootMeaning: meaningVi,
    meaningEn,
    meaningVi,
  };
}

function buildRootsCsvDescription(meaning: string) {
  return `Nhóm gốc từ xoay quanh nghĩa "${meaning.trim()}".`;
}

function buildRootsCsvSentence(example: string) {
  const { primaryValue, secondaryValue } = splitBilingualValue(example);
  const englishSentence = primaryValue || example.trim();
  const vietnameseSentence = secondaryValue || englishSentence;

  return {
    english_sentence: englishSentence,
    vietnamese_sentence: vietnameseSentence,
    usage_context: null,
    is_daily_usage: true,
  };
}

function groupRootsCsvRows(rows: RootsCsvImportRowInput[]) {
  const grouped = new Map<string, RootWordInput>();

  rows.forEach((row) => {
    const key = row.root.toLowerCase();
    const existing = grouped.get(key);
    const exampleSentences = row.examples.map(buildRootsCsvSentence);
    const parsedMeaning = parseRootsCsvMeaning(row.meaning);

    if (!existing) {
      grouped.set(key, {
        root: row.root,
        meaning: parsedMeaning.rootMeaning,
        description: buildRootsCsvDescription(parsedMeaning.meaningVi),
        // Roots-only CSV keeps a simpler template and always imports as basic.
        level: ROOTS_CSV_DEFAULT_LEVEL,
        tags: [],
        is_published: true,
        words: row.word_list.map((word) => ({
          word,
          part_of_speech: "word family",
          pronunciation: row.pronunciation ?? null,
          meaning_en: parsedMeaning.meaningEn,
          meaning_vi: parsedMeaning.meaningVi,
          example_sentences: exampleSentences,
        })),
      });
      return;
    }

    const knownWords = new Set(existing.words.map((word) => word.word.toLowerCase()));
    row.word_list.forEach((word) => {
      if (knownWords.has(word.toLowerCase())) {
        return;
      }

      existing.words.push({
        word,
        part_of_speech: "word family",
        pronunciation: row.pronunciation ?? null,
        meaning_en: parsedMeaning.meaningEn,
        meaning_vi: parsedMeaning.meaningVi,
        example_sentences: exampleSentences,
      });
    });
  });

  return Array.from(grouped.values());
}

function previewDetailedImport(buffer: Buffer, fileName: string) {
  const valid: RootWordInput[] = [];
  const invalid: Array<{ index: number; message: string }> = [];

  try {
    if (fileName.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(buffer.toString("utf-8")) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Tệp JSON nhập vào phải là một mảng từ gốc.");
      }

      parsed.forEach((entry, index) => {
        const rootResult = rootWordSchema.safeParse(entry as RootWordInput);
        if (rootResult.success) {
          valid.push(rootResult.data);
        } else {
          invalid.push({
            index: index + 2,
            message: rootResult.error.issues.map((issue) => issue.message).join(", "),
          });
        }
      });

      return { valid, invalid };
    }

    const workbook = readWorkbook(buffer, fileName);
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: "",
    });
    const normalizedRows = rows.map(normalizeDetailedRow);
    const groupedRoots = groupDetailedRows(normalizedRows);

    groupedRoots.forEach((root, index) => {
      const parsed = rootWordSchema.safeParse(root);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        invalid.push({
          index: index + 2,
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        });
      }
    });
  } catch (error) {
    invalid.push({
      index: 1,
      message: error instanceof Error ? error.message : "Không thể phân tích tệp nhập liệu.",
    });
  }

  return { valid, invalid };
}

function previewRootsCsvImport(buffer: Buffer, fileName: string) {
  const validRows: RootsCsvImportRowInput[] = [];
  const valid: RootWordInput[] = [];
  const invalid: Array<{ index: number; message: string }> = [];

  try {
    if (!fileName.toLowerCase().endsWith(".csv")) {
      throw new Error("Chế độ nhập từ gốc chỉ hỗ trợ tệp CSV.");
    }

    const workbook = readWorkbook(buffer, fileName);
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    const firstRow = rows[0] ?? {};
    const missingHeaders = ROOTS_CSV_HEADERS.filter((header) => !(header in firstRow));
    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột CSV bắt buộc: ${missingHeaders.join(", ")}`);
    }

    rows.forEach((row, index) => {
      const parsedRow = normalizeRootsCsvRow(row);
      if (parsedRow.success) {
        validRows.push(parsedRow.data);
      } else {
        invalid.push({
          index: index + 2,
          message: parsedRow.error.issues.map((issue) => issue.message).join(", "),
        });
      }
    });

    const groupedRoots = groupRootsCsvRows(validRows);
    groupedRoots.forEach((root) => {
      const parsedRoot = rootWordSchema.safeParse(root);
      if (parsedRoot.success) {
        valid.push(parsedRoot.data);
      } else {
        invalid.push({
          index: 1,
          message: parsedRoot.error.issues.map((issue) => issue.message).join(", "),
        });
      }
    });
  } catch (error) {
    invalid.push({
      index: 1,
      message: error instanceof Error ? error.message : "Không thể phân tích tệp CSV từ gốc.",
    });
  }

  return { valid, invalid };
}

export async function parseImportFile(file: File, mode: ImportParseMode = "detailed") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (mode === "roots") {
    return previewRootsCsvImport(buffer, file.name);
  }

  return previewDetailedImport(buffer, file.name);
}
