import * as XLSX from "xlsx";

import {
  CLASS_LESSON_CSV_EXAMPLE_COLUMN_PAIRS,
  CLASS_LESSON_CSV_LIST_SEPARATOR,
  CLASS_LESSON_CSV_REQUIRED_HEADERS,
  classLessonVocabularyCsvRowSchema,
  type ClassLessonVocabularyCsvRowInput,
} from "@/lib/validations/classes";

function readClassLessonWorkbook(buffer: Buffer, fileName: string) {
  if (!fileName.toLowerCase().endsWith(".csv")) {
    throw new Error("Chế độ nhập từ vựng buổi học chỉ hỗ trợ tệp CSV.");
  }

  const csv = buffer.toString("utf8").replace(/^\uFEFF/, "");
  return XLSX.read(csv, {
    type: "string",
    FS: ",",
    PRN: false,
  });
}

function normalizeListCell(value: unknown) {
  const uniqueValues = new Set<string>();

  for (const item of String(value ?? "")
    .split(CLASS_LESSON_CSV_LIST_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    uniqueValues.add(item);
  }

  return Array.from(uniqueValues);
}

function normalizeExampleSentences(row: Record<string, unknown>) {
  const exampleSentences: ClassLessonVocabularyCsvRowInput["exampleSentences"] = [];
  const issues: string[] = [];

  for (const pair of CLASS_LESSON_CSV_EXAMPLE_COLUMN_PAIRS) {
    const english = String(row[pair.english] ?? "").trim();
    const vietnamese = String(row[pair.vietnamese] ?? "").trim();

    if (!english && !vietnamese) {
      continue;
    }

    if (!english) {
      issues.push(`Cột ${pair.english} không được trống khi đã nhập ${pair.vietnamese}.`);
      continue;
    }

    if (!vietnamese) {
      issues.push(`Cột ${pair.vietnamese} không được trống khi đã nhập ${pair.english}.`);
      continue;
    }

    exampleSentences.push({
      english,
      vietnamese,
    });
  }

  if (exampleSentences.length === 0) {
    issues.push("Cần ít nhất một cặp câu ví dụ song ngữ.");
  }

  return {
    exampleSentences,
    issues,
  };
}

function normalizeImportRow(row: Record<string, unknown>) {
  const normalizedExamples = normalizeExampleSentences(row);
  const parsedRow = classLessonVocabularyCsvRowSchema.safeParse({
    word: String(row.Word ?? "").trim(),
    meaning: String(row.Meaning ?? "").trim(),
    pronunciation: String(row.Pronunciation ?? "").trim() || null,
    synonyms: normalizeListCell(row.Synonyms),
    exampleSentences: normalizedExamples.exampleSentences,
  });

  if (!parsedRow.success || normalizedExamples.issues.length > 0) {
    const schemaIssues = parsedRow.success ? [] : parsedRow.error.issues.map((issue) => issue.message);

    return {
      success: false as const,
      message: [...schemaIssues, ...normalizedExamples.issues].join(", "),
    };
  }

  return {
    success: true as const,
    data: parsedRow.data,
  };
}

export async function parseClassLessonVocabularyImportFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const valid: ClassLessonVocabularyCsvRowInput[] = [];
  const invalid: Array<{ index: number; message: string }> = [];

  try {
    const workbook = readClassLessonWorkbook(buffer, file.name);
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const headerRows = XLSX.utils.sheet_to_json<Array<unknown>>(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    if (headerRows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    const headers = (headerRows[0] ?? []).map((value) => String(value ?? "").trim());
    const missingHeaders = CLASS_LESSON_CSV_REQUIRED_HEADERS.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột CSV bắt buộc: ${missingHeaders.join(", ")}`);
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (rows.length === 0) {
      throw new Error("Tệp CSV đang trống.");
    }

    const seenWords = new Set<string>();

    rows.forEach((row, index) => {
      const parsedRow = normalizeImportRow(row);
      if (!parsedRow.success) {
        invalid.push({
          index: index + 2,
          message: parsedRow.message,
        });
        return;
      }

      const normalizedWord = parsedRow.data.word.toLocaleLowerCase("en-US");
      if (seenWords.has(normalizedWord)) {
        invalid.push({
          index: index + 2,
          message: `Từ "${parsedRow.data.word}" đã xuất hiện trước đó trong file CSV.`,
        });
        return;
      }

      seenWords.add(normalizedWord);
      valid.push(parsedRow.data);
    });
  } catch (error) {
    invalid.push({
      index: 1,
      message: error instanceof Error ? error.message : "Không thể phân tích tệp CSV từ vựng buổi học.",
    });
  }

  return { valid, invalid };
}
