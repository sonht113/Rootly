import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { parseRootWordQuizImportFile } from "@/server/services/root-word-quiz-import-service";

function canManageRootWordQuizzes(role: string | undefined) {
  return role === "admin" || role === "teacher";
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageRootWordQuizzes(profile.role)) {
    return NextResponse.json({ message: "Bạn không có quyền nhập quiz." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Vui lòng chọn tệp CSV để nhập quiz." }, { status: 400 });
  }

  const result = await parseRootWordQuizImportFile(file);
  return NextResponse.json(result);
}
