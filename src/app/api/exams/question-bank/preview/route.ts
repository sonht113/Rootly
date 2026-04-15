import { NextResponse } from "next/server";

import { EXAM_MAX_QUESTION_COUNT } from "@/lib/validations/exams";
import { getCurrentProfile } from "@/lib/auth/session";
import { parseExamQuestionBankImportFile } from "@/server/services/exam-question-bank-import-service";

function canManageExamQuestionBank(role: string | undefined) {
  return role === "admin" || role === "teacher";
}

function parseSelectedQuestionCount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return 0;
  }

  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageExamQuestionBank(profile.role)) {
    return NextResponse.json({ message: "Bạn không có quyền nhập câu hỏi." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Vui lòng chọn tệp CSV để xem trước." }, { status: 400 });
  }

  const selectedQuestionCount = parseSelectedQuestionCount(formData.get("selectedQuestionCount"));
  if (!Number.isInteger(selectedQuestionCount) || selectedQuestionCount < 0 || selectedQuestionCount > EXAM_MAX_QUESTION_COUNT) {
    return NextResponse.json({ message: "Số câu hiện tại của bộ đề không hợp lệ." }, { status: 400 });
  }

  const result = await parseExamQuestionBankImportFile(file, { selectedQuestionCount });
  return NextResponse.json(result);
}
