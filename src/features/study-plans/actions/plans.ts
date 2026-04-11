"use server";

import { revalidatePath } from "next/cache";

import { schedulePlanSchema, updatePlanSchema } from "@/lib/validations/study-plans";
import {
  completeStudyPlan,
  createStudyPlan,
  deleteStudyPlan,
  submitReview,
  updateStudyPlan,
} from "@/server/repositories/study-repository";

function revalidateRootWordPages(rootWordId: string) {
  revalidatePath("/library");
  revalidatePath(`/library/${rootWordId}`);
  revalidatePath("/roots");
  revalidatePath(`/roots/${rootWordId}`);
}

export async function createStudyPlanAction(input: unknown) {
  const parsed = schedulePlanSchema.parse(input);
  await createStudyPlan(parsed);
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidateRootWordPages(parsed.rootWordId);
}

export async function updateStudyPlanAction(input: unknown) {
  const parsed = updatePlanSchema.parse(input);
  await updateStudyPlan(parsed);
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidateRootWordPages(parsed.rootWordId);
}

export async function deleteStudyPlanAction(planId: string) {
  await deleteStudyPlan(planId);
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/library");
  revalidatePath("/roots");
}

export async function completeStudyPlanAction(planId: string) {
  await completeStudyPlan(planId);
  revalidatePath("/today");
  revalidatePath("/progress");
  revalidatePath("/reviews");
  revalidatePath("/library");
  revalidatePath("/roots");
}

export async function submitReviewAction(reviewId: string, remembered: boolean) {
  await submitReview(reviewId, remembered);
  revalidatePath("/reviews");
  revalidatePath("/today");
  revalidatePath("/progress");
  revalidatePath("/library");
  revalidatePath("/roots");
}
