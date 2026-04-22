import { render, screen, within } from "@testing-library/react";
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
  it("renders vocabulary as mobile cards and a desktop table with bilingual example content", () => {
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

    const mobileCards = screen.getByTestId("lesson-vocabulary-cards");
    const desktopTable = screen.getByTestId("lesson-vocabulary-table");

    expect(within(mobileCards).getByText("Từ vựng")).toBeInTheDocument();
    expect(within(mobileCards).getByText("classroom")).toBeInTheDocument();
    expect(within(mobileCards).getByText("phòng học")).toBeInTheDocument();
    expect(within(mobileCards).getByText("/ˈklɑːsruːm/")).toBeInTheDocument();
    expect(within(mobileCards).getByText("schoolroom")).toBeInTheDocument();
    expect(within(mobileCards).getByText("The classroom is ready.")).toBeInTheDocument();
    expect(within(mobileCards).getByText("Phòng học đã sẵn sàng.")).toBeInTheDocument();

    expect(within(desktopTable).getByRole("table")).toBeInTheDocument();
    expect(within(desktopTable).getByRole("columnheader", { name: "Từ vựng" })).toBeInTheDocument();
    expect(within(desktopTable).getByText("classroom")).toBeInTheDocument();
    expect(within(desktopTable).getByText("phòng học")).toBeInTheDocument();
    expect(within(desktopTable).getByText("/ˈklɑːsruːm/")).toBeInTheDocument();
    expect(within(desktopTable).getByText("The classroom is ready.")).toBeInTheDocument();
    expect(within(desktopTable).getByText("Phòng học đã sẵn sàng.")).toBeInTheDocument();
  });

  it("paginates shared vocabulary data across mobile cards and desktop table", async () => {
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

    const mobileCards = screen.getByTestId("lesson-vocabulary-cards");
    const desktopTable = screen.getByTestId("lesson-vocabulary-table");

    expect(within(mobileCards).getByText("word-1")).toBeInTheDocument();
    expect(within(mobileCards).getByText("word-10")).toBeInTheDocument();
    expect(within(mobileCards).queryByText("word-11")).not.toBeInTheDocument();

    expect(within(desktopTable).getByText("word-1")).toBeInTheDocument();
    expect(within(desktopTable).getByText("word-10")).toBeInTheDocument();
    expect(within(desktopTable).queryByText("word-11")).not.toBeInTheDocument();
    expect(screen.getByTestId("lesson-vocabulary-pagination")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(within(mobileCards).queryByText("word-1")).not.toBeInTheDocument();
    expect(within(mobileCards).getByText("word-11")).toBeInTheDocument();

    expect(within(desktopTable).queryByText("word-1")).not.toBeInTheDocument();
    expect(within(desktopTable).getByText("word-11")).toBeInTheDocument();
    expect(screen.getByText("Trang 2/2")).toBeInTheDocument();
  });
});
