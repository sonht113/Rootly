import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { rootWordQuizImportCommitSchema } from "@/lib/validations/root-word-quizzes";
import { importRootWordQuizSet } from "@/server/repositories/root-word-quizzes-repository";

function canManageRootWordQuizzes(role: string | undefined) {
  return role === "admin" || role === "teacher";
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageRootWordQuizzes(profile.role)) {
    return NextResponse.json({ message: "Bạn không có quyền nhập quiz." }, { status: 403 });
  }

  const payload = rootWordQuizImportCommitSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Dữ liệu nhập quiz chưa hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await importRootWordQuizSet(
      payload.data.rootWordId,
      payload.data.questions,
      profile.auth_user_id,
    );

    revalidatePath(`/roots/${payload.data.rootWordId}`);
    revalidatePath(`/library/${payload.data.rootWordId}`);
    revalidatePath(`/quiz/${payload.data.rootWordId}`);
    revalidatePath("/roots");
    revalidatePath("/library");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Không thể nhập quiz cho từ gốc này.",
      },
      { status: 400 },
    );
  }
}
