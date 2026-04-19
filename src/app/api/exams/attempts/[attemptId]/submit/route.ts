import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { examAttemptSubmissionSchema } from "@/lib/validations/exams";
import { submitExamAttempt } from "@/server/repositories/exams-repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ message: "Bạn cần đăng nhập để nộp bài thi." }, { status: 401 });
  }

  const payload = examAttemptSubmissionSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Dữ liệu bài thi chưa hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const { attemptId } = await params;
    const result = await submitExamAttempt(attemptId, payload.data.answers);

    revalidatePath("/exams");
    revalidatePath(`/exams/${result.examId}`);
    revalidatePath("/ranking");

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể nộp bài thi.";

    return NextResponse.json(
      {
        message,
      },
      { status: getExamAttemptErrorStatus(message) },
    );
  }
}

function getExamAttemptErrorStatus(message: string) {
  if (message.includes("Dữ liệu") || message.includes("Bộ câu trả lời") || message.includes("không thuộc")) {
    return 400;
  }

  if (message.includes("đang mở") || message.includes("để nộp")) {
    return 409;
  }

  return 500;
}
