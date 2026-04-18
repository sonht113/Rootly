"use server";

import { revalidatePath } from "next/cache";

import {
  acceptClassSuggestionSchema,
  addMemberSchema,
  createClassLessonSchema,
  createClassSchema,
  deleteClassLessonSchema,
  removeClassMemberSchema,
  searchClassMemberCandidatesSchema,
  suggestRootSchema,
  uploadClassLessonVocabularySchema,
} from "@/lib/validations/classes";
import {
  acceptClassSuggestionIntoPlan,
  addClassMemberByUserId,
  createClassLesson,
  createTeacherClass,
  deleteClassLesson,
  removeClassMember,
  replaceClassLessonVocabulary,
  searchClassMemberCandidates,
  suggestRootWordForClass,
} from "@/server/repositories/classes-repository";
import { parseClassLessonVocabularyImportFile } from "@/server/services/class-lesson-import-service";

function revalidateClassLessonViews(classId: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/classes/${classId}`);
}

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

export async function createClassLessonAction(input: unknown) {
  const parsed = createClassLessonSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Thông tin buổi học chưa hợp lệ.",
    };
  }

  try {
    await createClassLesson(parsed.data.classId, parsed.data.title, parsed.data.description ?? null);
    revalidateClassLessonViews(parsed.data.classId);

    return {
      success: true,
      message: "Đã tạo buổi học mới.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể tạo buổi học.",
    };
  }
}

export async function deleteClassLessonAction(input: unknown) {
  const parsed = deleteClassLessonSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Không xác định được buổi học cần xóa.",
    };
  }

  try {
    await deleteClassLesson(parsed.data.classId, parsed.data.lessonId);
    revalidateClassLessonViews(parsed.data.classId);

    return {
      success: true,
      message: "Đã xóa buổi học.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể xóa buổi học.",
    };
  }
}

export async function uploadClassLessonVocabularyAction(formData: FormData) {
  const parsed = uploadClassLessonVocabularySchema.safeParse({
    classId: formData.get("classId"),
    lessonId: formData.get("lessonId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Không xác định được buổi học cần tải CSV.",
      invalid: [],
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false,
      message: "Vui lòng chọn tệp CSV từ vựng.",
      invalid: [],
    };
  }

  try {
    const parsedFile = await parseClassLessonVocabularyImportFile(file);

    if (parsedFile.invalid.length > 0) {
      return {
        success: false,
        message: `Tệp CSV chưa hợp lệ. Có ${parsedFile.invalid.length} dòng cần điều chỉnh.`,
        invalid: parsedFile.invalid,
      };
    }

    const importedCount = await replaceClassLessonVocabulary(parsed.data.classId, parsed.data.lessonId, parsedFile.valid);
    revalidateClassLessonViews(parsed.data.classId);

    return {
      success: true,
      message: `Đã cập nhật ${importedCount} từ vựng cho buổi học.`,
      invalid: [],
      importedCount,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể tải CSV từ vựng.",
      invalid: [],
    };
  }
}
