import { describe, expect, it } from "vitest";

import { getNotificationsRealtimeTopic } from "@/features/notifications/lib/notifications-realtime";

describe("notifications-realtime", () => {
  it("builds a user-scoped realtime topic", () => {
    expect(getNotificationsRealtimeTopic("auth-user-1")).toBe("user:auth-user-1:notifications");
  });
});
