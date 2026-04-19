import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedCreateServerSupabaseClient,
  mockedRecordRootWordDetailView,
} = vi.hoisted(() => ({
  mockedCreateServerSupabaseClient: vi.fn(),
  mockedRecordRootWordDetailView: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockedCreateServerSupabaseClient,
}));

vi.mock("@/server/repositories/study-repository", () => ({
  recordRootWordDetailView: mockedRecordRootWordDetailView,
}));

import { POST } from "@/app/api/root-word-detail-view/route";

const ROOT_WORD_ID = "11111111-1111-4111-8111-111111111111";

describe("POST /api/root-word-detail-view", () => {
  beforeEach(() => {
    mockedCreateServerSupabaseClient.mockReset();
    mockedRecordRootWordDetailView.mockReset();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
        }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/root-word-detail-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rootWordId: ROOT_WORD_ID }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedRecordRootWordDetailView).not.toHaveBeenCalled();
  });

  it("returns 400 when the payload is invalid", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
          },
        }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/root-word-detail-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rootWordId: "invalid-root-id" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedRecordRootWordDetailView).not.toHaveBeenCalled();
  });

  it("records the detail view and returns the normalized payload", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
          },
        }),
      },
    });
    mockedRecordRootWordDetailView.mockResolvedValue({
      recorded: true,
      sessionId: "session-1",
    });

    const response = await POST(
      new Request("http://localhost/api/root-word-detail-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rootWordId: ROOT_WORD_ID }),
      }),
    );
    const result = (await response.json()) as { recorded?: boolean; sessionId?: string };

    expect(response.status).toBe(200);
    expect(result).toEqual({
      recorded: true,
      sessionId: "session-1",
    });
    expect(mockedRecordRootWordDetailView).toHaveBeenCalledWith(ROOT_WORD_ID);
  });
});
