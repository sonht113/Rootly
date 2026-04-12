import type { ComponentProps } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedRefresh, mockedDeleteStudyPlanAction, mockedToastSuccess, mockedToastError } = vi.hoisted(() => ({
  mockedRefresh: vi.fn(),
  mockedDeleteStudyPlanAction: vi.fn(),
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

vi.mock("@/features/study-plans/components/schedule-plan-dialog", () => ({
  SchedulePlanDialog: ({ triggerAriaLabel }: { triggerAriaLabel?: string }) => (
    <button type="button">{triggerAriaLabel ?? "schedule-dialog"}</button>
  ),
}));

vi.mock("@/features/study-plans/actions/plans", () => ({
  createStudyPlanAction: vi.fn(),
  deleteStudyPlanAction: mockedDeleteStudyPlanAction,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockedToastSuccess,
    error: mockedToastError,
  },
}));

import { CalendarPlanner } from "@/features/study-plans/components/calendar-planner";

const TODAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date());

function getDateKeyFromOffset(days: number) {
  const baseDate = new Date(`${TODAY_KEY}T00:00:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().slice(0, 10);
}

describe("CalendarPlanner", () => {
  beforeEach(() => {
    mockedRefresh.mockReset();
    mockedDeleteStudyPlanAction.mockReset();
    mockedDeleteStudyPlanAction.mockResolvedValue(undefined);
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
  });

  it("renders plan cards with detail and delete actions without manual meta or edit action", () => {
    render(
      <CalendarPlanner
        rootWords={[
          { id: "root-1", root: "spect", meaning: "look" },
          { id: "root-2", root: "bio", meaning: "life" },
        ]}
        plans={[
          {
            id: "plan-1",
            scheduled_date: TODAY_KEY,
            status: "planned",
            source: "manual",
            root_word: {
              id: "root-1",
              root: "spect",
              meaning: "look",
              level: "basic",
            },
          },
        ]}
        reviews={[
          {
            id: "review-1",
            review_date: TODAY_KEY,
            status: "pending",
            review_step: 1,
            root_word: {
              id: "root-2",
              root: "bio",
              meaning: "life",
            },
          },
        ]}
      />,
    );

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href));

    expect(screen.getAllByRole("link", { name: "Xem chi tiết" })).toHaveLength(2);
    expect(hrefs).toContain("/library/root-1");
    expect(hrefs).toContain("/library/root-2");
    expect(screen.getByRole("button", { name: "Xóa lịch học cho spect" })).toBeInTheDocument();
    expect(screen.queryByText("Thủ công")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chỉnh sửa lịch học cho spect" })).not.toBeInTheDocument();
  });

  it("opens the delete confirmation modal and deletes a planned root word after confirmation", async () => {
    const user = userEvent.setup();

    render(
      <CalendarPlanner
        rootWords={[
          { id: "root-1", root: "spect", meaning: "look" },
          { id: "root-2", root: "bio", meaning: "life" },
        ]}
        plans={[
          {
            id: "plan-1",
            scheduled_date: TODAY_KEY,
            status: "planned",
            source: "manual",
            root_word: {
              id: "root-1",
              root: "spect",
              meaning: "look",
              level: "basic",
            },
          },
        ]}
        reviews={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa lịch học cho spect" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Xóa lịch học này?")).toBeInTheDocument();
    expect(within(dialog).getByText(/spect/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Xóa" }));

    await waitFor(() => {
      expect(mockedDeleteStudyPlanAction).toHaveBeenCalledWith("plan-1");
      expect(mockedToastSuccess).toHaveBeenCalledWith("Đã xóa lịch học");
      expect(mockedRefresh).toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("renders overdue completed plans with a yellow completed state instead of overdue", async () => {
    const user = userEvent.setup();

    render(
      <CalendarPlanner
        rootWords={[{ id: "root-1", root: "spect", meaning: "look" }]}
        plans={[
          {
            id: "plan-1",
            scheduled_date: getDateKeyFromOffset(-7),
            status: "completed",
            source: "manual",
            root_word: {
              id: "root-1",
              root: "spect",
              meaning: "look",
              level: "basic",
            },
          },
        ]}
        reviews={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xem tuần trước" }));

    const card = screen.getByRole("button", { name: "Xóa lịch học cho spect" }).closest("article");

    expect(screen.getByText("Đã hoàn thành")).toBeInTheDocument();
    expect(screen.queryByText("Quá hạn")).not.toBeInTheDocument();
    expect(card?.className).toContain("bg-[#fff4c2]");
  });

  it("renders newly completed plans with a green success state", () => {
    render(
      <CalendarPlanner
        rootWords={[{ id: "root-1", root: "spect", meaning: "look" }]}
        plans={[
          {
            id: "plan-1",
            scheduled_date: TODAY_KEY,
            status: "completed",
            source: "manual",
            root_word: {
              id: "root-1",
              root: "spect",
              meaning: "look",
              level: "basic",
            },
          },
        ]}
        reviews={[]}
      />,
    );

    const card = screen.getByRole("button", { name: "Xóa lịch học cho spect" }).closest("article");

    expect(screen.getByText("Đã hoàn thành")).toBeInTheDocument();
    expect(card?.className).toContain("bg-[#dff7e5]");
  });
});
