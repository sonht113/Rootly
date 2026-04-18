import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/classes/actions/classes", () => ({
  createClassLessonAction: vi.fn(),
  deleteClassLessonAction: vi.fn(),
  uploadClassLessonVocabularyAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { StudentClassLessonsPanel } from "@/features/classes/components/class-lessons-panel";
import type { ClassLesson } from "@/server/repositories/classes-repository";

describe("class-lessons-panel", () => {
  it("renders Vietnamese lesson content and keeps vocabulary list scrollable", () => {
    const lessons: ClassLesson[] = [
      {
        id: "lesson-1",
        classId: "class-1",
        title: "Buổi 1 - Từ vựng lớp học",
        description: "Ôn lại đồ vật và vai trò thường gặp trong lớp học.",
        vocabularyItemCount: 1,
        createdAt: "2026-04-18T08:00:00.000Z",
        updatedAt: "2026-04-18T09:30:00.000Z",
        vocabularyItems: [
          {
            id: "item-1",
            lessonId: "lesson-1",
            word: "classroom",
            meaning: "phòng học",
            synonyms: ["schoolroom", "lecture room"],
            exampleSentences: ["The classroom is ready.", "Students enter the classroom early."],
            createdAt: "2026-04-18T08:00:00.000Z",
            updatedAt: "2026-04-18T09:30:00.000Z",
          },
        ],
      },
    ];

    render(<StudentClassLessonsPanel lessons={lessons} />);

    expect(screen.getByText("Buổi học từ giáo viên")).toBeInTheDocument();
    expect(screen.getByText("Ôn lại đồ vật và vai trò thường gặp trong lớp học.")).toBeInTheDocument();
    expect(screen.getByText("phòng học")).toBeInTheDocument();

    const scrollContainer = screen.getByTestId("lesson-vocabulary-scroll-container");
    expect(scrollContainer.className).toContain("max-h-[24rem]");
    expect(scrollContainer.className).toContain("overflow-y-auto");
  });
});
