import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/classes/actions/classes", () => ({
  addClassMemberAction: vi.fn(),
  createTeacherClassAction: vi.fn(),
  removeClassMemberAction: vi.fn(),
  searchClassMemberCandidatesAction: vi.fn(async () => ({
    success: true,
    items: [],
    message: null,
  })),
  suggestRootAction: vi.fn(),
}));

import { AddMemberForm, SuggestRootForm } from "@/features/classes/components/class-manager";
import {
  addMemberSchema,
  createClassSchema,
  searchClassMemberCandidatesSchema,
  suggestRootSchema,
} from "@/lib/validations/classes";

describe("class-manager flow guards", () => {
  it("trims class creation inputs before submission", () => {
    expect(
      createClassSchema.parse({
        name: "  Lớp Latin  ",
        description: "  Học đều mỗi ngày  ",
      }),
    ).toEqual({
      name: "Lớp Latin",
      description: "Học đều mỗi ngày",
    });
  });

  it("expects a selected user id for the add-member flow", () => {
    expect(
      addMemberSchema.parse({
        classId: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({
      classId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("requires at least two characters before searching member candidates", () => {
    expect(() =>
      searchClassMemberCandidatesSchema.parse({
        classId: "11111111-1111-4111-8111-111111111111",
        query: "s",
      }),
    ).toThrow("Hãy nhập ít nhất 2 ký tự để tìm học viên");
  });

  it("shows search guidance before the teacher types a username prefix", () => {
    render(<AddMemberForm classId="11111111-1111-4111-8111-111111111111" />);

    expect(screen.getByText("Gõ ít nhất 2 ký tự đầu của username để tìm học viên chưa thuộc lớp này.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm" })).toBeDisabled();
  });

  it("shows the short-query guidance for member search", async () => {
    const user = userEvent.setup();

    render(<AddMemberForm classId="11111111-1111-4111-8111-111111111111" />);

    await user.type(screen.getByPlaceholderText("Tìm theo username, ví dụ: son"), "s");

    expect(screen.getByText("Hãy nhập ít nhất 2 ký tự để tìm học viên.")).toBeInTheDocument();
  });

  it("rejects malformed suggestion dates", () => {
    expect(() =>
      suggestRootSchema.parse({
        classId: "11111111-1111-4111-8111-111111111111",
        rootWordId: "22222222-2222-4222-8222-222222222222",
        suggestedDate: "14/04/2026",
      }),
    ).toThrow("Ngày gợi ý không hợp lệ");
  });

  it("shows a guidance state when no published root words are available", () => {
    render(<SuggestRootForm classId="11111111-1111-1111-1111-111111111111" rootWords={[]} />);

    expect(screen.getByText("Hãy xuất bản ít nhất một root word trong khu vực admin trước khi tạo gợi ý cho lớp.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gợi ý" })).not.toBeInTheDocument();
  });
});
