import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockedRefresh,
  }),
}));

import { RootWordDetailStreakTracker } from "@/features/root-words/components/root-word-detail-streak-tracker";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  trigger(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          target: document.createElement("div"),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

describe("RootWordDetailStreakTracker", () => {
  beforeEach(() => {
    mockedRefresh.mockReset();
    MockIntersectionObserver.instances = [];
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recorded: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("waits for the user to scroll before recording the detail view", async () => {
    render(<RootWordDetailStreakTracker rootWordId="11111111-1111-4111-8111-111111111111" />);

    MockIntersectionObserver.instances[0]?.trigger(true);

    expect(global.fetch).not.toHaveBeenCalled();

    Object.defineProperty(window, "scrollY", {
      value: 160,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/root-word-detail-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rootWordId: "11111111-1111-4111-8111-111111111111",
        }),
      });
    });
    await waitFor(() => {
      expect(mockedRefresh).toHaveBeenCalled();
    });
  });

  it("records once when the user reaches the end after scrolling", async () => {
    render(<RootWordDetailStreakTracker rootWordId="11111111-1111-4111-8111-111111111111" />);

    Object.defineProperty(window, "scrollY", {
      value: 200,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
    MockIntersectionObserver.instances[0]?.trigger(true);
    MockIntersectionObserver.instances[0]?.trigger(true);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not refresh when the session was already recorded for today", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recorded: false }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    render(<RootWordDetailStreakTracker rootWordId="11111111-1111-4111-8111-111111111111" />);

    Object.defineProperty(window, "scrollY", {
      value: 180,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
    MockIntersectionObserver.instances[0]?.trigger(true);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("root-word-detail-streak-sentinel")).toBeInTheDocument();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });
});
