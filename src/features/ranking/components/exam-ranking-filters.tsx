"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

interface ExamRankingFiltersProps {
  examId?: string;
  exams: Array<{
    id: string;
    title: string;
    class_name: string | null;
    scope: "class" | "global";
  }>;
}

export function ExamRankingFilters({ examId, exams }: ExamRankingFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateExam(nextExamId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("source", "exam");
    params.set("examId", nextExamId);

    const target = `${pathname}?${params.toString()}`;
    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  }

  return (
    <section className={cn("rounded-[24px] bg-[#f2f4f6] p-4 transition-opacity md:max-w-[420px] md:p-5", isPending && "opacity-70")}>
      <Select value={examId ?? exams[0]?.id} onValueChange={updateExam}>
        <SelectTrigger className="h-11 rounded-[12px] border-transparent bg-white px-4 text-left text-sm font-semibold text-[#191c1e] shadow-none focus:ring-[#bfd5ff]">
          <SelectValue placeholder="Chọn kỳ thi" />
        </SelectTrigger>
        <SelectContent>
          {exams.map((exam) => (
            <SelectItem key={exam.id} value={exam.id}>
              {exam.title}
              {exam.class_name ? ` · ${exam.class_name}` : exam.scope === "global" ? " · Toàn hệ thống" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
