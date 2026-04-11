import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-[96px] w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-[color:var(--foreground)] shadow-sm placeholder:text-[color:var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };

