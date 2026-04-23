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
    expect(screen.getByText(/gán level basic/i)).toBeInTheDocument();

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

  it("shows a fallback error toast when the commit response body is empty", async () => {
    const user = userEvent.setup();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ valid: [{ root: "spect" }], invalid: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(<ImportPanel />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(
      [
        JSON.stringify([
          {
            root: "spect",
            meaning: "to look",
            description: "Words related to seeing or observing.",
            level: "basic",
            tags: ["observation"],
            is_published: true,
            words: [
              {
                word: "inspect",
                part_of_speech: "verb",
                pronunciation: "/in-spekt/",
                meaning_en: "to look closely",
                meaning_vi: "kiểm tra kỹ",
                example_sentences: [
                  {
                    english_sentence: "Please inspect the report.",
                    vietnamese_sentence: "Hãy kiểm tra báo cáo.",
                    usage_context: "workplace",
                    is_daily_usage: true,
                  },
                ],
              },
            ],
          },
        ]),
      ],
      "root-words.json",
      { type: "application/json" },
    );

    await user.upload(input!, file);
    await user.click(screen.getByRole("button", { name: "Xem trước dữ liệu" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import hợp lệ" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Import hợp lệ" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockedToastError).toHaveBeenCalledWith("Không thể nhập dữ liệu.");
    });
  });
});
