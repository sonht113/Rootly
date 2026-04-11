import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-[20px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-32 rounded-[20px]" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-[20px]" />
    </div>
  );
}

