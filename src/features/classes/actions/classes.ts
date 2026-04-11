"use server";

import { revalidatePath } from "next/cache";

import { addMemberSchema, createClassSchema, suggestRootSchema } from "@/lib/validations/classes";
import {
  addClassMemberByUsername,
  createTeacherClass,
  suggestRootWordForClass,
} from "@/server/repositories/classes-repository";

export async function createTeacherClassAction(input: unknown) {
  const parsed = createClassSchema.parse(input);
  await createTeacherClass(parsed.name, parsed.description ?? null);
  revalidatePath("/teacher/classes");
}

export async function addClassMemberAction(input: unknown) {
  const parsed = addMemberSchema.parse(input);
  await addClassMemberByUsername(parsed.classId, parsed.username);
  revalidatePath(`/teacher/classes/${parsed.classId}`);
}

export async function suggestRootAction(input: unknown) {
  const parsed = suggestRootSchema.parse(input);
  await suggestRootWordForClass(parsed.classId, parsed.rootWordId, parsed.suggestedDate);
  revalidatePath(`/teacher/classes/${parsed.classId}`);
}

