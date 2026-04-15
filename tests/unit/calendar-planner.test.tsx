import type { ComponentProps } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedRefresh, mockedDeleteStudyPlanAction, mockedToastSuccess, mockedToastError, mockedScheduleDialogProps } = vi.hoisted(() => ({
  mockedRefresh: vi.fn(),
  mockedDeleteStudyPlanAction: vi.fn(),
  mockedToastSuccess: vi.fn(),
  mockedToastError: vi.fn(),
  mockedScheduleDialogProps: [] as Array<{ rootWords: Array<{ id: string; root: string; meaning: string }> }>,
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
  SchedulePlanDialog: ({
    rootWords,
    triggerAriaLabel,
  }: {
    rootWords: Array<{ id: string; root: string; meaning: string }>;
    triggerAriaLabel?: string;
  }) => {
    mockedScheduleDialogProps.push({ rootWords });
    return <button type="button">{triggerAriaLabel ?? "schedule-dialog"}</button>;
  },
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
    mockedScheduleDialogProps.length = 0;
  });

  it("renders plan and review cards with their respective calendar actions", () => {
    const { container } = render(
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
    const calendarScrollViewport = container.querySelector(".overflow-x-auto");
    const calendarGrid = calendarScrollViewport?.firstElementChild;

    expect(screen.getByRole("link", { name: "học ngay" })).toHaveAttribute("href", "/library/root-1");
    expect(screen.getByRole("link", { name: "Ôn tập" })).toHaveAttribute("href", "/library/root-2?reviewId=review-1");
    expect(calendarScrollViewport?.className).toContain("xl:max-w-[68rem]");
    expect(calendarGrid?.className).toContain("min-w-[1168px]");
    expect(calendarGrid?.className).toContain("lg:min-w-[1264px]");
    expect(calendarGrid?.className).toContain("xl:min-w-[1312px]");
    expect(calendarGrid?.className).not.toContain("xl:min-w-0");
    expect(hrefs).toContain("/library/root-1");
    expect(hrefs).toContain("/library/root-2?reviewId=review-1");
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
  it("excludes root words that are already planned outside the current week from add dialogs", () => {
    render(
      <CalendarPlanner
        rootWords={[
          { id: "root-1", root: "spect", meaning: "look" },
          { id: "root-2", root: "bio", meaning: "life" },
        ]}
        plans={[
          {
            id: "plan-1",
            scheduled_date: getDateKeyFromOffset(10),
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

    expect(mockedScheduleDialogProps.length).toBeGreaterThan(0);
    expect(
      mockedScheduleDialogProps.every((props) =>
        props.rootWords.every((rootWord) => rootWord.id !== "root-1"),
      ),
    ).toBe(true);
    expect(
      mockedScheduleDialogProps.some((props) =>
        props.rootWords.some((rootWord) => rootWord.id === "root-2"),
      ),
    ).toBe(true);
  });
});
