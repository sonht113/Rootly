import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-[color:var(--primary-soft)] p-4 text-[color:var(--primary-strong)]">
          <Inbox className="size-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="max-w-md text-sm text-[color:var(--muted-foreground)]">{description}</p>
        </div>
        {actionLabel && actionHref ? (
          <Button asChild variant="outline">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

