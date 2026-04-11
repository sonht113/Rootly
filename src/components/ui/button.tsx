import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--primary)] text-white shadow-sm hover:bg-[color:var(--primary-strong)]",
        secondary:
          "bg-[color:var(--muted)] text-[color:var(--foreground)] hover:bg-[color:var(--border-subtle)]",
        outline:
          "border border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:bg-[color:var(--muted)]",
        ghost: "text-[color:var(--foreground)] hover:bg-[color:var(--muted)]",
        accent: "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:opacity-90",
        danger: "bg-[color:var(--danger)] text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

