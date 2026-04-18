import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetClassLessons,
  mockedGetCurrentStudentClass,
  mockedGetCurrentStudentClasses,
  mockedGetCurrentUserClassSuggestions,
  mockedGetAccessibleExamsForCurrentUser,
} = vi.hoisted(() => ({
  mockedGetClassLessons: vi.fn(),
  mockedGetCurrentStudentClass: vi.fn(),
  mockedGetCurrentStudentClasses: vi.fn(),
  mockedGetCurrentUserClassSuggestions: vi.fn(),
  mockedGetAccessibleExamsForCurrentUser: vi.fn(),
}));

vi.mock("@/server/repositories/classes-repository", () => ({
  getClassLessons: mockedGetClassLessons,
  getCurrentStudentClass: mockedGetCurrentStudentClass,
  getCurrentStudentClasses: mockedGetCurrentStudentClasses,
  getCurrentUserClassSuggestions: mockedGetCurrentUserClassSuggestions,
}));

vi.mock("@/server/repositories/exams-repository", () => ({
  getAccessibleExamsForCurrentUser: mockedGetAccessibleExamsForCurrentUser,
}));

import { getStudentClassDetailView, getStudentClassesOverview } from "@/server/services/classes-service";

describe("classes-service", () => {
  beforeEach(() => {
    mockedGetClassLessons.mockReset();
    mockedGetCurrentStudentClass.mockReset();
    mockedGetCurrentStudentClasses.mockReset();
    mockedGetCurrentUserClassSuggestions.mockReset();
    mockedGetAccessibleExamsForCurrentUser.mockReset();
  });

  it("aggregates assignment and exam counts for each student class", async () => {
    mockedGetCurrentStudentClasses.mockResolvedValue([
      {
        id: "class-1",
        name: "Lớp 7A",
        description: "Mô tả lớp",
        memberCount: 12,
      },
    ]);
    mockedGetCurrentUserClassSuggestions.mockResolvedValue([
      {
        id: "suggestion-1",
        classId: "class-1",
        className: "Lớp 7A",
        rootWord: {
          id: "root-1",
          root: "spect",
          meaning: "nhìn",
          level: "basic",
        },
        suggestedDate: "2026-04-20",
        status: "pending",
      },
      {
        id: "suggestion-2",
        classId: "class-1",
        className: "Lớp 7A",
        rootWord: {
          id: "root-2",
          root: "scrib",
          meaning: "viết",
          level: "basic",
        },
        suggestedDate: "2026-04-21",
        status: "accepted",
      },
    ]);
    mockedGetAccessibleExamsForCurrentUser.mockResolvedValue([
      {
        id: "exam-1",
        title: "Kiểm tra lớp 7A",
        description: null,
        scope: "class",
        class_id: "class-1",
        class_name: "Lớp 7A",
        status: "published",
        starts_at: null,
        ends_at: null,
        question_count: 20,
        total_points: 100,
        user_attempt: null,
      },
      {
        id: "exam-2",
        title: "Kỳ thi toàn hệ thống",
        description: null,
        scope: "global",
        class_id: null,
        class_name: null,
        status: "published",
        starts_at: null,
        ends_at: null,
        question_count: 15,
        total_points: 75,
        user_attempt: null,
      },
    ]);
    mockedGetClassLessons.mockResolvedValue([]);

    await expect(getStudentClassesOverview()).resolves.toEqual([
      {
        id: "class-1",
        name: "Lớp 7A",
        description: "Mô tả lớp",
        memberCount: 12,
        assignmentCount: 2,
        pendingAssignmentCount: 1,
        examCount: 1,
        openExamCount: 1,
      },
    ]);
  });

  it("filters assignments and exams to the requested class detail", async () => {
    mockedGetCurrentStudentClass.mockResolvedValue({
      id: "class-1",
      name: "Lớp 7A",
      description: null,
      memberCount: 12,
    });
    mockedGetCurrentUserClassSuggestions.mockResolvedValue([
      {
        id: "suggestion-1",
        classId: "class-1",
        className: "Lớp 7A",
        rootWord: {
          id: "root-1",
          root: "spect",
          meaning: "nhìn",
          level: "basic",
        },
        suggestedDate: "2026-04-20",
        status: "pending",
      },
      {
        id: "suggestion-2",
        classId: "class-2",
        className: "Lớp 8A",
        rootWord: {
          id: "root-2",
          root: "scrib",
          meaning: "viết",
          level: "basic",
        },
        suggestedDate: "2026-04-21",
        status: "accepted",
      },
    ]);
    mockedGetAccessibleExamsForCurrentUser.mockResolvedValue([
      {
        id: "exam-1",
        title: "Kiểm tra lớp 7A",
        description: null,
        scope: "class",
        class_id: "class-1",
        class_name: "Lớp 7A",
        status: "published",
        starts_at: null,
        ends_at: null,
        question_count: 20,
        total_points: 100,
        user_attempt: null,
      },
      {
        id: "exam-2",
        title: "Kiểm tra lớp 8A",
        description: null,
        scope: "class",
        class_id: "class-2",
        class_name: "Lớp 8A",
        status: "published",
        starts_at: null,
        ends_at: null,
        question_count: 10,
        total_points: 50,
        user_attempt: null,
      },
    ]);
    mockedGetClassLessons.mockResolvedValue([
      {
        id: "lesson-1",
        classId: "class-1",
        title: "Buoi 1",
        description: "Tu vung co ban",
        vocabularyItemCount: 2,
        createdAt: "2026-04-18T08:00:00.000Z",
        updatedAt: "2026-04-18T09:00:00.000Z",
        vocabularyItems: [
          {
            id: "item-1",
            lessonId: "lesson-1",
            word: "classroom",
            meaning: "phong hoc",
            synonyms: ["schoolroom"],
            exampleSentences: ["The classroom is ready."],
            createdAt: "2026-04-18T08:00:00.000Z",
            updatedAt: "2026-04-18T08:00:00.000Z",
          },
        ],
      },
    ]);

    const result = await getStudentClassDetailView("class-1");

    expect(result).toEqual({
      classItem: {
        id: "class-1",
        name: "Lớp 7A",
        description: null,
        memberCount: 12,
        assignmentCount: 1,
        pendingAssignmentCount: 1,
        examCount: 1,
        openExamCount: 1,
      },
      assignments: [
        {
          id: "suggestion-1",
          classId: "class-1",
          className: "Lớp 7A",
          rootWord: {
            id: "root-1",
            root: "spect",
            meaning: "nhìn",
            level: "basic",
          },
          suggestedDate: "2026-04-20",
          status: "pending",
        },
      ],
      exams: [
        {
          id: "exam-1",
          title: "Kiểm tra lớp 7A",
          description: null,
          scope: "class",
          class_id: "class-1",
          class_name: "Lớp 7A",
          status: "published",
          starts_at: null,
          ends_at: null,
          question_count: 20,
          total_points: 100,
          user_attempt: null,
        },
      ],
      lessons: [
        {
          id: "lesson-1",
          classId: "class-1",
          title: "Buoi 1",
          description: "Tu vung co ban",
          vocabularyItemCount: 2,
          createdAt: "2026-04-18T08:00:00.000Z",
          updatedAt: "2026-04-18T09:00:00.000Z",
          vocabularyItems: [
            {
              id: "item-1",
              lessonId: "lesson-1",
              word: "classroom",
              meaning: "phong hoc",
              synonyms: ["schoolroom"],
              exampleSentences: ["The classroom is ready."],
              createdAt: "2026-04-18T08:00:00.000Z",
              updatedAt: "2026-04-18T08:00:00.000Z",
            },
          ],
        },
      ],
    });
  });

  it("returns null when the current user is not a member of the class", async () => {
    mockedGetCurrentStudentClass.mockResolvedValue(null);
    mockedGetCurrentUserClassSuggestions.mockResolvedValue([]);
    mockedGetAccessibleExamsForCurrentUser.mockResolvedValue([]);
    mockedGetClassLessons.mockResolvedValue([]);

    await expect(getStudentClassDetailView("class-1")).resolves.toBeNull();
  });
});
