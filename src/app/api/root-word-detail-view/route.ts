import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rootWordDetailViewSchema } from "@/lib/validations/root-words";
import { recordRootWordDetailView } from "@/server/repositories/study-repository";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Bạn cần đăng nhập để ghi nhận lượt xem root word." }, { status: 401 });
  }

  const payload = rootWordDetailViewSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.issues[0]?.message ?? "Dữ liệu root word chưa hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await recordRootWordDetailView(payload.data.rootWordId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Không thể ghi nhận lượt xem chi tiết root word.",
      },
      { status: 500 },
    );
  }
}
