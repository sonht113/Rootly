"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface RootWordDetailStreakTrackerProps {
  rootWordId: string;
}

interface DetailViewResponse {
  recorded?: boolean;
}

export function RootWordDetailStreakTracker({ rootWordId }: RootWordDetailStreakTrackerProps) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);
  const hasReachedEndRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    async function recordDetailView() {
      if (!hasScrolledRef.current || !hasReachedEndRef.current || requestInFlightRef.current || hasRecordedRef.current) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        const response = await fetch("/api/root-word-detail-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rootWordId,
          }),
        });

        if (response.status === 401) {
          hasRecordedRef.current = true;
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to record root word detail view: ${response.status}`);
        }

        const result = (await response.json()) as DetailViewResponse;
        hasRecordedRef.current = true;

        if (result.recorded) {
          startTransition(() => {
            router.refresh();
          });
        }
      } catch (error) {
        requestInFlightRef.current = false;
        console.error("Failed to record root word detail streak", error);
      }
    }

    function handleScroll() {
      if (window.scrollY <= 0) {
        return;
      }

      if (!hasScrolledRef.current) {
        hasScrolledRef.current = true;
      }

      void recordDetailView();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        hasReachedEndRef.current = true;
        void recordDetailView();
      },
      {
        threshold: 0.25,
      },
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [rootWordId, router]);

  return <div ref={sentinelRef} aria-hidden="true" data-testid="root-word-detail-streak-sentinel" className="h-px w-full" />;
}
