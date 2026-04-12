import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    rpc: mockedRpc,
  })),
}));

import { recordRootWordDetailView } from "@/server/repositories/study-repository";

describe("recordRootWordDetailView", () => {
  beforeEach(() => {
    mockedRpc.mockReset();
  });

  it("calls the detail-view RPC and returns the normalized payload", async () => {
    mockedRpc.mockResolvedValue({
      data: {
        recorded: true,
        sessionId: "session-1",
      },
      error: null,
    });

    await expect(recordRootWordDetailView("root-1")).resolves.toEqual({
      recorded: true,
      sessionId: "session-1",
    });
    expect(mockedRpc).toHaveBeenCalledWith("record_root_word_detail_view", {
      p_root_word_id: "root-1",
    });
  });

  it("falls back to a non-recorded payload when the RPC returns empty data", async () => {
    mockedRpc.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(recordRootWordDetailView("root-2")).resolves.toEqual({
      recorded: false,
      sessionId: null,
    });
  });
});
