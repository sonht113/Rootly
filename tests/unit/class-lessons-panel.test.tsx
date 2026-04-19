import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("renders the vocabulary list as a table with bilingual example content", () => {
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
            pronunciation: "/ˈklɑːsruːm/",
            synonyms: ["schoolroom", "lecture room"],
            exampleSentences: [
              {
                english: "The classroom is ready.",
                vietnamese: "Phòng học đã sẵn sàng.",
              },
              {
                english: "Students enter the classroom early.",
                vietnamese: "Học sinh vào lớp sớm.",
              },
            ],
            createdAt: "2026-04-18T08:00:00.000Z",
            updatedAt: "2026-04-18T09:30:00.000Z",
          },
        ],
      },
    ];

    render(<StudentClassLessonsPanel lessons={lessons} />);

    expect(screen.getByText("Buổi học từ giáo viên")).toBeInTheDocument();
    expect(screen.getByText("Ôn lại đồ vật và vai trò thường gặp trong lớp học.")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Từ vựng" })).toBeInTheDocument();
    expect(screen.getByText("phòng học")).toBeInTheDocument();
    expect(screen.getByText("/ˈklɑːsruːm/")).toBeInTheDocument();
    expect(screen.getByText("The classroom is ready.")).toBeInTheDocument();
    expect(screen.getByText("Phòng học đã sẵn sàng.")).toBeInTheDocument();
  });

  it("paginates vocabulary rows 10 items at a time", async () => {
    const user = userEvent.setup();
    const lessons: ClassLesson[] = [
      {
        id: "lesson-2",
        classId: "class-1",
        title: "Buổi 2 - Daily Activities",
        description: "Luyện tập từ vựng thường dùng hằng ngày.",
        vocabularyItemCount: 11,
        createdAt: "2026-04-18T08:00:00.000Z",
        updatedAt: "2026-04-18T09:30:00.000Z",
        vocabularyItems: Array.from({ length: 11 }, (_, index) => ({
          id: `item-${index + 1}`,
          lessonId: "lesson-2",
          word: `word-${index + 1}`,
          meaning: `nghĩa-${index + 1}`,
          pronunciation: `/word-${index + 1}/`,
          synonyms: [`synonym-${index + 1}`],
          exampleSentences: [
            {
              english: `Example ${index + 1} EN`,
              vietnamese: `Ví dụ ${index + 1} VI`,
            },
          ],
          createdAt: "2026-04-18T08:00:00.000Z",
          updatedAt: "2026-04-18T09:30:00.000Z",
        })),
      },
    ];

    render(<StudentClassLessonsPanel lessons={lessons} />);

    expect(screen.getByText("word-1")).toBeInTheDocument();
    expect(screen.getByText("word-10")).toBeInTheDocument();
    expect(screen.queryByText("word-11")).not.toBeInTheDocument();
    expect(screen.getByTestId("lesson-vocabulary-pagination")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(screen.queryByText("word-1")).not.toBeInTheDocument();
    expect(screen.getByText("word-11")).toBeInTheDocument();
    expect(screen.getByText("Trang 2/2")).toBeInTheDocument();
  });
});
