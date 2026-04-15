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
    return NextResponse.json({ message: "Ban can dang nhap de nop bai thi." }, { status: 401 });
  }

  const payload = examAttemptSubmissionSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Du lieu bai thi chua hop le.",
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
    const message = error instanceof Error ? error.message : "Khong the nop bai thi.";

    return NextResponse.json(
      {
        message,
      },
      { status: getExamAttemptErrorStatus(message) },
    );
  }
}

function getExamAttemptErrorStatus(message: string) {
  if (message.includes("Du lieu") || message.includes("Bo cau tra loi") || message.includes("khong thuoc")) {
    return 400;
  }

  if (message.includes("dang mo") || message.includes("de nop")) {
    return 409;
  }

  return 500;
}
