import { describe, expect, it, vi } from "vitest";

import {
  formatSupabaseErrorMessage,
  runSupabaseReadQueryWithRetry,
  unwrapSupabaseError,
} from "@/server/repositories/shared";

describe("shared repository helpers", () => {
  it("preserves normal Supabase error messages", () => {
    expect(formatSupabaseErrorMessage({ message: "permission denied for table class_root_suggestions" }, "Fallback")).toBe(
      "permission denied for table class_root_suggestions",
    );
  });

  it("normalizes HTML upstream errors into a friendly message", () => {
    expect(() =>
      unwrapSupabaseError(
        {
          message: `<html>
<head><title>500 Internal Server Error</title></head>
<body>
<center><h1>500 Internal Server Error</h1></center>
<hr><center>cloudflare</center>
</body>
</html>`,
        },
        "Không thể tải danh sách gợi ý từ lớp",
      ),
    ).toThrow("Không thể tải danh sách gợi ý từ lớp. Supabase tạm thời gặp sự cố máy chủ, vui lòng thử lại sau ít phút.");
  });

  it("retries a transient read query once before succeeding", async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "<html><body><h1>503 Service Unavailable</h1><center>cloudflare</center></body></html>",
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: "suggestion-1" }],
        error: null,
      });

    await expect(runSupabaseReadQueryWithRetry(operation)).resolves.toEqual({
      data: [{ id: "suggestion-1" }],
      error: null,
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
