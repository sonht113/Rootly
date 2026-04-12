import type { ComponentProps } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockedRefresh, mockedToastSuccess, mockedToastError } = vi.hoisted(() => ({
  mockedRefresh: vi.fn(),
  mockedToastSuccess: vi.fn(),
  mockedToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockedRefresh,
  }),
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

import { RootWordQuizActions } from "@/features/root-words/components/root-word-quiz-actions";

describe("RootWordQuizActions", () => {
  beforeEach(() => {
    mockedRefresh.mockReset();
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the delete confirmation modal and cancels without deleting", async () => {
    const user = userEvent.setup();

    render(
      <RootWordQuizActions
        rootWordId="root-1"
        rootWordLabel="spect"
        hasQuiz
        questionCount={10}
        canManageQuiz
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa quiz" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Xóa bộ quiz hiện tại?")).toBeInTheDocument();
    expect(within(dialog).getByText(/Bộ quiz của từ gốc/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Hủy" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deletes the quiz after confirmation and refreshes the page", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 10 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <RootWordQuizActions
        rootWordId="root-1"
        rootWordLabel="spect"
        hasQuiz
        questionCount={10}
        canManageQuiz
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa quiz" }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Xóa quiz" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/root-word-quizzes/root-1", {
        method: "DELETE",
      });
      expect(mockedToastSuccess).toHaveBeenCalledWith('Đã xóa quiz của từ gốc "spect".');
      expect(mockedRefresh).toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("keeps the delete modal open when the delete request fails", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Không thể xóa quiz." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <RootWordQuizActions
        rootWordId="root-1"
        rootWordLabel="spect"
        hasQuiz
        questionCount={10}
        canManageQuiz
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa quiz" }));

    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Xóa quiz" }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith("Không thể xóa quiz.");
    });

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
