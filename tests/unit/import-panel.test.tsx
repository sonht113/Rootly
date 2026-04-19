import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedToastSuccess, mockedToastError } = vi.hoisted(() => ({
  mockedToastSuccess: vi.fn(),
  mockedToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockedToastSuccess,
    error: mockedToastError,
  },
}));

import { ImportPanel } from "@/features/admin-content/components/import-panel";

describe("ImportPanel", () => {
  beforeEach(() => {
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ valid: [{ root: "spect" }], invalid: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("sends roots preview requests with mode=roots and exposes the full CSV template", async () => {
    const user = userEvent.setup();

    render(<ImportPanel />);

    await user.click(screen.getByRole("button", { name: /Roots-only import/i }));

    expect(screen.getByRole("link", { name: "Tải template full 60 roots" })).toHaveAttribute(
      "href",
      "/templates/root-words-full.csv",
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.accept).toBe(".csv,text/csv");

    const file = new File(
      [
        [
          "Root Word,Meaning,Word List,Examples,Pronunciation",
          '"spect","to look => nhìn; xem","inspect|respect|spectator|perspective|retrospect","Please inspect the report. => Hãy kiểm tra báo cáo.|Her perspective helped the team. => Góc nhìn của cô ấy giúp cả nhóm.","/spekt/"',
        ].join("\n"),
      ],
      "root-words-full.csv",
      { type: "text/csv" },
    );

    await user.upload(input!, file);
    await user.click(screen.getByRole("button", { name: "Xem trước dữ liệu" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/imports/preview");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(FormData);

    const formData = options?.body as FormData;
    expect(formData.get("mode")).toBe("roots");
    expect((formData.get("file") as File | null)?.name).toBe("root-words-full.csv");

    expect(mockedToastSuccess).toHaveBeenCalledWith("Đã phân tích tệp nhập liệu");
    expect(screen.getByText(/Bản xem trước:/)).toBeInTheDocument();
  });
});
