import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  badgeText?: string;
}

export function PageHeader({ eyebrow, title, description, action, badgeText }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--primary-strong)]">{eyebrow}</p> : null}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">{title}</h1>
            {badgeText ? <Badge>{badgeText}</Badge> : null}
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

