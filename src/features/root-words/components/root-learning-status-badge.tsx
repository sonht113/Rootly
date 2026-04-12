import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { RootLearningStatus } from "@/lib/root-learning-status";

interface RootLearningStatusBadgeProps {
  status: RootLearningStatus;
  className?: string;
}

const STATUS_CONFIG: Record<Exclude<RootLearningStatus, null>, { label: string; variant: "default" | "success" | "warning" }> = {
  completed: {
    label: "Đã hoàn thành",
    variant: "default",
  },
  reviewing: {
    label: "Đang ôn tập",
    variant: "warning",
  },
  remembered: {
    label: "Đã nhớ",
    variant: "success",
  },
};

export function RootLearningStatusBadge({ status, className }: RootLearningStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn("w-fit", className)}>
      {config.label}
    </Badge>
  );
}
