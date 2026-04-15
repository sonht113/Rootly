import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { examQuestionBankImportCommitSchema } from "@/lib/validations/exams";
import { createQuestionBankItems } from "@/server/repositories/exams-repository";
import { getExamQuestionImportSelectionLimitMessage } from "@/server/services/exam-question-bank-import-service";

function canManageExamQuestionBank(role: string | undefined) {
  return role === "admin" || role === "teacher";
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageExamQuestionBank(profile.role)) {
    return NextResponse.json({ message: "Bạn không có quyền nhập câu hỏi." }, { status: 403 });
  }

  const payload = examQuestionBankImportCommitSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Dữ liệu import câu hỏi chưa hợp lệ.",
      },
      { status: 400 },
    );
  }

  const selectionLimitMessage = getExamQuestionImportSelectionLimitMessage(
    payload.data.selectedQuestionCount,
    payload.data.questions.length,
  );
  if (selectionLimitMessage) {
    return NextResponse.json({ message: selectionLimitMessage }, { status: 400 });
  }

  try {
    const items = await createQuestionBankItems(payload.data.questions);

    revalidatePath("/teacher/exams");
    if (payload.data.examId) {
      revalidatePath(`/teacher/exams/${payload.data.examId}`);
    }

    return NextResponse.json({
      importedCount: items.length,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Không thể nhập câu hỏi vào ngân hàng.",
      },
      { status: 400 },
    );
  }
}
