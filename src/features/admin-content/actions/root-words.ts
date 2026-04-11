"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import { rootWordSchema } from "@/lib/validations/root-words";
import { deleteRootWord, upsertRootWord } from "@/server/repositories/root-words-repository";

export async function saveRootWordAction(input: unknown) {
  const user = await getCurrentSession();
  if (!user) {
    throw new Error("Bạn cần đăng nhập để tiếp tục.");
  }

  const parsed = rootWordSchema.parse(input);
  await upsertRootWord(parsed, user.id);
  revalidatePath("/admin/root-words");
  revalidatePath("/library");
}

export async function deleteRootWordAction(rootWordId: string) {
  await deleteRootWord(rootWordId);
  revalidatePath("/admin/root-words");
  revalidatePath("/library");
}

