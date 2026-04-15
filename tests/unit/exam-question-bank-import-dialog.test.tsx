import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedToastSuccess, mockedToastError } = vi.hoisted(() => ({
  mockedToastSuccess: vi.fn(),
  mockedToastError: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockedToastSuccess,
    error: mockedToastError,
  },
}));

import { ExamQuestionBankImportDialog } from "@/features/exams/components/exam-question-bank-import-dialog";

const IMPORT_QUESTION = {
  question_type: "multiple_choice" as const,
  prompt: "Root spect is closest to which meaning?",
  correct_answer: "look",
  explanation: "spect relates to looking or seeing.",
  option_a: "look",
  option_b: "write",
  option_c: "carry",
  option_d: "say",
};

const IMPORTED_ITEM = {
  id: "11111111-1111-4111-8111-111111111111",
  created_by: "teacher-1",
  ...IMPORT_QUESTION,
  created_at: "2026-04-15T03:00:00.000Z",
  updated_at: "2026-04-15T03:00:00.000Z",
};

describe("ExamQuestionBankImportDialog", () => {
  beforeEach(() => {
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    global.fetch = vi.fn();
  });

  it("previews a CSV file and commits imported questions", async () => {
    const user = userEvent.setup();
    const handleImportedItems = vi.fn();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ valid: [IMPORT_QUESTION], invalid: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ importedCount: 1, items: [IMPORTED_ITEM] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <ExamQuestionBankImportDialog
        examId="22222222-2222-4222-8222-222222222222"
        selectedQuestionCount={2}
        onImportedItems={handleImportedItems}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Import CSV" }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(
      [
        [
          "Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation",
          '"Root ""spect"" is closest to which meaning?","look","write","carry","say","A","spect relates to looking or seeing."',
        ].join("\n"),
      ],
      "exam-question-bank-import.csv",
      { type: "text/csv" },
    );

    await user.upload(input!, file);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Root spect is closest to which meaning?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Lưu câu hỏi" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(handleImportedItems).toHaveBeenCalledWith([IMPORTED_ITEM]);
    });

    const commitCall = vi.mocked(global.fetch).mock.calls[1];
    expect(commitCall?.[0]).toBe("/api/exams/question-bank/commit");
    expect(String(commitCall?.[1]?.body)).toContain('"selectedQuestionCount":2');
    expect(mockedToastSuccess).toHaveBeenCalled();
  });
});
