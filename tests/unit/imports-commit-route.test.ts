import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedGetCurrentProfile,
  mockedImportRootWordBatches,
  mockedRevalidatePath,
} = vi.hoisted(() => ({
  mockedGetCurrentProfile: vi.fn(),
  mockedImportRootWordBatches: vi.fn(),
  mockedRevalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockedRevalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: mockedGetCurrentProfile,
}));

vi.mock("@/server/repositories/root-words-repository", () => ({
  importRootWordBatches: mockedImportRootWordBatches,
}));

import { POST } from "@/app/api/imports/commit/route";

const VALID_ROOT = {
  root: "port",
  meaning: "to carry",
  description: "Words related to carrying, bringing, or transporting.",
  level: "basic" as const,
  tags: ["travel"],
  is_published: true,
  words: [
    {
      word: "import",
      part_of_speech: "verb",
      pronunciation: "/im-port/",
      meaning_en: "to bring in",
      meaning_vi: "nhap vao",
      example_sentences: [
        {
          english_sentence: "The shop will import new goods.",
          vietnamese_sentence: "Cua hang se nhap hang moi.",
          usage_context: "business",
          is_daily_usage: true,
        },
      ],
    },
  ],
};

describe("POST /api/imports/commit", () => {
  beforeEach(() => {
    mockedGetCurrentProfile.mockReset();
    mockedImportRootWordBatches.mockReset();
    mockedRevalidatePath.mockReset();

    mockedGetCurrentProfile.mockResolvedValue({
      auth_user_id: "admin-1",
      role: "admin",
    });
    mockedImportRootWordBatches.mockResolvedValue({
      importedCount: 1,
    });
  });

  it("imports valid roots and revalidates root-word pages", async () => {
    const response = await POST(
      new Request("http://localhost/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: [VALID_ROOT] }),
      }),
    );

    const result = (await response.json()) as { importedCount: number };

    expect(response.status).toBe(200);
    expect(result.importedCount).toBe(1);
    expect(mockedImportRootWordBatches).toHaveBeenCalledWith([VALID_ROOT], "admin-1");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/root-words");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/roots");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/library");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/roots");
  });

  it("rejects unauthorized requests", async () => {
    mockedGetCurrentProfile.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: [VALID_ROOT] }),
      }),
    );

    const result = (await response.json()) as { message: string };

    expect(response.status).toBe(403);
    expect(result.message).toBe("Ban khong co quyen nhap noi dung.");
    expect(mockedImportRootWordBatches).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads with a JSON error message", async () => {
    const response = await POST(
      new Request("http://localhost/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: [] }),
      }),
    );

    const result = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(result.message).toBe("Khong co root word hop le de import.");
    expect(mockedImportRootWordBatches).not.toHaveBeenCalled();
  });

  it("returns repository failures as JSON instead of a bare 500", async () => {
    mockedImportRootWordBatches.mockRejectedValueOnce(
      new Error('Khong the import root "port". duplicate key value violates unique constraint'),
    );

    const response = await POST(
      new Request("http://localhost/api/imports/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roots: [VALID_ROOT] }),
      }),
    );

    const result = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(result.message).toContain('Khong the import root "port"');
  });
});
