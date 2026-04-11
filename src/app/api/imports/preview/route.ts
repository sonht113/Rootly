import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { parseImportFile } from "@/server/services/import-service";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Bạn không có quyền nhập nội dung." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "roots" ? "roots" : "detailed";

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Vui lòng chọn tệp để nhập." }, { status: 400 });
  }

  const result = await parseImportFile(file, mode);
  return NextResponse.json(result);
}
