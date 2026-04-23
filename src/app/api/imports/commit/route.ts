import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import { rootWordSchema } from "@/lib/validations/root-words";
import { importRootWordBatches } from "@/server/repositories/root-words-repository";

const importRootWordCommitSchema = z.object({
  roots: z.array(rootWordSchema).min(1, "Khong co root word hop le de import."),
});

function getImportCommitErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "Du lieu nhap noi dung chua hop le.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Khong the nhap du lieu root word.";
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Ban khong co quyen nhap noi dung." }, { status: 403 });
  }

  try {
    const payload = importRootWordCommitSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        {
          message: payload.error.issues[0]?.message ?? "Du lieu nhap noi dung chua hop le.",
        },
        { status: 400 },
      );
    }

    const result = await importRootWordBatches(payload.data.roots, profile.auth_user_id);

    revalidatePath("/admin/root-words");
    revalidatePath("/admin/roots");
    revalidatePath("/library");
    revalidatePath("/roots");

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: getImportCommitErrorMessage(error),
      },
      { status: 400 },
    );
  }
}
