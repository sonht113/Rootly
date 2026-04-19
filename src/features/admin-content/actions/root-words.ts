"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentSession, requireRole } from "@/lib/auth/session";
import { rootWordSchema } from "@/lib/validations/root-words";
import { setTodayDailyRootRecommendation } from "@/server/repositories/daily-root-recommendations-repository";
import { deleteRootWord, upsertRootWord } from "@/server/repositories/root-words-repository";

const rootWordIdSchema = z.string().uuid("Root word không hợp lệ.");

export async function saveRootWordAction(input: unknown) {
  const user = await getCurrentSession();
  if (!user) {
    throw new Error("Bạn cần đăng nhập để tiếp tục.");
  }

  const parsed = rootWordSchema.parse(input);
  await upsertRootWord(parsed, user.id);
  revalidatePath("/admin/root-words");
  revalidatePath("/admin/roots");
  revalidatePath("/library");
}

export async function deleteRootWordAction(rootWordId: string) {
  await deleteRootWord(rootWordId);
  revalidatePath("/admin/root-words");
  revalidatePath("/admin/roots");
  revalidatePath("/library");
}

export async function setTodayRecommendedRootWordAction(rootWordId: string) {
  const profile = await requireRole(["admin"]);
  const parsedRootWordId = rootWordIdSchema.parse(rootWordId);

  await setTodayDailyRootRecommendation(parsedRootWordId, profile.auth_user_id);

  revalidatePath("/admin/root-words");
  revalidatePath("/admin/roots");
  revalidatePath("/today");
}
