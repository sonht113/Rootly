"use server";

import { revalidatePath } from "next/cache";

import {
  acceptClassSuggestionSchema,
  addMemberSchema,
  createClassSchema,
  removeClassMemberSchema,
  searchClassMemberCandidatesSchema,
  suggestRootSchema,
} from "@/lib/validations/classes";
import {
  acceptClassSuggestionIntoPlan,
  addClassMemberByUserId,
  createTeacherClass,
  removeClassMember,
  searchClassMemberCandidates,
  suggestRootWordForClass,
} from "@/server/repositories/classes-repository";

export async function searchClassMemberCandidatesAction(input: unknown) {
  const parsed = searchClassMemberCandidatesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      items: [],
      message: parsed.error.issues[0]?.message ?? "Không thể tìm học viên phù hợp.",
    };
  }

  try {
    const items = await searchClassMemberCandidates(parsed.data.classId, parsed.data.query);

    return {
      success: true,
      items,
      message: null,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      message: error instanceof Error ? error.message : "Không thể tìm học viên phù hợp.",
    };
  }
}

export async function createTeacherClassAction(input: unknown) {
  const parsed = createClassSchema.parse(input);
  await createTeacherClass(parsed.name, parsed.description ?? null);
  revalidatePath("/teacher/classes");
}

export async function addClassMemberAction(input: unknown) {
  const parsed = addMemberSchema.parse(input);
  await addClassMemberByUserId(parsed.classId, parsed.userId);
  revalidatePath(`/teacher/classes/${parsed.classId}`);
}

export async function suggestRootAction(input: unknown) {
  const parsed = suggestRootSchema.parse(input);
  await suggestRootWordForClass(parsed.classId, parsed.rootWordId, parsed.suggestedDate);
  revalidatePath(`/teacher/classes/${parsed.classId}`);
}

export async function removeClassMemberAction(input: unknown) {
  const parsed = removeClassMemberSchema.parse(input);
  await removeClassMember(parsed.memberId);
  revalidatePath(`/teacher/classes/${parsed.classId}`);
}

export async function acceptClassSuggestionAction(input: unknown) {
  const parsed = acceptClassSuggestionSchema.parse(input);
  const result = await acceptClassSuggestionIntoPlan(parsed.suggestionId);

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/library");
  revalidatePath("/roots");

  return result;
}
