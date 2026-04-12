"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshOnMount({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [enabled, router]);

  return null;
}
