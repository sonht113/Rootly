import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { rootWordSchema } from "@/lib/validations/root-words";
import { importRootWordBatches } from "@/server/repositories/root-words-repository";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Bạn không có quyền nhập nội dung." }, { status: 403 });
  }

  const payload = (await request.json()) as { roots?: unknown[] };
  const roots = Array.isArray(payload.roots)
    ? payload.roots.map((root: unknown) => rootWordSchema.parse(root))
    : [];

  const result = await importRootWordBatches(roots, profile.auth_user_id);

  revalidatePath("/admin/root-words");
  revalidatePath("/admin/roots");
  revalidatePath("/library");
  revalidatePath("/roots");

  return NextResponse.json(result);
}
