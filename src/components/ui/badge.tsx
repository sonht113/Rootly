import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--primary-soft)] text-[color:var(--primary-strong)]",
        success: "bg-[color:var(--success-soft)] text-[color:var(--success-strong)]",
        warning: "bg-[color:var(--accent-soft)] text-[color:var(--accent-foreground)]",
        danger: "bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
        outline: "border border-[color:var(--border)] text-[color:var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

