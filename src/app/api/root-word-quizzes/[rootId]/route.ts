import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { deleteRootWordQuizSet } from "@/server/repositories/root-word-quizzes-repository";

function canManageRootWordQuizzes(role: string | undefined) {
  return role === "admin" || role === "teacher";
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ rootId: string }> },
) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageRootWordQuizzes(profile.role)) {
    return NextResponse.json({ message: "Bạn không có quyền xóa quiz." }, { status: 403 });
  }

  const { rootId } = await params;
  const result = await deleteRootWordQuizSet(rootId);

  revalidatePath(`/roots/${rootId}`);
  revalidatePath(`/library/${rootId}`);
  revalidatePath(`/quiz/${rootId}`);
  revalidatePath("/roots");
  revalidatePath("/library");

  return NextResponse.json(result);
}
