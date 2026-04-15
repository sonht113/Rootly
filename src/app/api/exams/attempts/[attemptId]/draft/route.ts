import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { examAttemptDraftSaveSchema } from "@/lib/validations/exams";
import { saveExamAttemptDraft } from "@/server/repositories/exams-repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: "Ban can dang nhap de luu nhap bai thi." }, { status: 401 });
  }

  const payload = examAttemptDraftSaveSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Du lieu nhap bai thi chua hop le.",
      },
      { status: 400 },
    );
  }

  try {
    const { attemptId } = await params;
    const result = await saveExamAttemptDraft(attemptId, payload.data.answers);

    revalidatePath(`/exams/${result.examId}`);
    if (result.finalized) {
      revalidatePath("/exams");
      revalidatePath("/ranking");
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the luu nhap bai thi.";

    return NextResponse.json(
      {
        message,
      },
      { status: getExamAttemptErrorStatus(message) },
    );
  }
}

function getExamAttemptErrorStatus(message: string) {
  if (message.includes("Du lieu") || message.includes("Danh sach") || message.includes("khong thuoc")) {
    return 400;
  }

  if (message.includes("dang mo") || message.includes("de luu nhap")) {
    return 409;
  }

  return 500;
}
