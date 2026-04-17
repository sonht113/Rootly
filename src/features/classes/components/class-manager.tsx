"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, Search, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addClassMemberAction,
  createTeacherClassAction,
  removeClassMemberAction,
  searchClassMemberCandidatesAction,
  suggestRootAction,
} from "@/features/classes/actions/classes";
import { createClassSchema, suggestRootSchema } from "@/lib/validations/classes";
import { cn } from "@/lib/utils/cn";
import { normalizeProfileSearchText } from "@/lib/utils/profile";
import type { ClassMemberCandidate } from "@/server/repositories/classes-repository";

type CreateClassFormValues = z.input<typeof createClassSchema>;
type SuggestRootFormValues = z.input<typeof suggestRootSchema>;

const MEMBER_SEARCH_DEBOUNCE_MS = 250;
const MIN_MEMBER_SEARCH_LENGTH = 2;

export function CreateClassForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateClassFormValues>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        await createTeacherClassAction(values);
        toast.success("Đã tạo lớp học");
        form.reset();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tạo lớp học");
      }
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo lớp mới</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Tên lớp</Label>
            <Input {...form.register("name")} placeholder="Ví dụ: Lớp gốc từ 101" />
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <Input {...form.register("description")} placeholder="Lớp nhỏ học 10-15 phút mỗi ngày" />
          </div>
          <Button type="submit" className="self-end" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
            Tạo lớp
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AddMemberForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ClassMemberCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ClassMemberCandidate | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isAdding, startAddTransition] = useTransition();
  const latestSearchRequestRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = normalizeProfileSearchText(query);
    latestSearchRequestRef.current += 1;
    const requestId = latestSearchRequestRef.current;

    if (normalizedQuery.length === 0 || normalizedQuery.length < MIN_MEMBER_SEARCH_LENGTH) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startSearchTransition(async () => {
        const result = await searchClassMemberCandidatesAction({
          classId,
          query,
        });

        if (requestId !== latestSearchRequestRef.current) {
          return;
        }

        if (!result.success) {
          setCandidates([]);
          setSearchMessage(result.message);
          return;
        }

        setCandidates(result.items);
        setSearchMessage(result.items.length === 0 ? "Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ecdc vi\u00ean ph\u00f9 h\u1ee3p." : null);
        setSelectedCandidate((current) =>
          current && result.items.some((item) => item.userId === current.userId) ? current : null,
        );
      });
    }, MEMBER_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [classId, query]);

  function handleCandidateSearchChange(value: string) {
    setQuery(value);
    setSelectedCandidate(null);

    const normalizedQuery = normalizeProfileSearchText(value);
    if (normalizedQuery.length === 0) {
      setCandidates([]);
      setSearchMessage(null);
      return;
    }

    if (normalizedQuery.length < MIN_MEMBER_SEARCH_LENGTH) {
      setCandidates([]);
      setSearchMessage(`H\u00e3y nh\u1eadp \u00edt nh\u1ea5t ${MIN_MEMBER_SEARCH_LENGTH} k\u00fd t\u1ef1 \u0111\u1ec3 t\u00ecm h\u1ecdc vi\u00ean.`);
      return;
    }

    setSearchMessage(null);
  }

  function handleSelectCandidate(candidate: ClassMemberCandidate) {
    setSelectedCandidate(candidate);
    setQuery(candidate.fullName);
    setCandidates((current) =>
      current.some((item) => item.userId === candidate.userId) ? current : [candidate, ...current],
    );
    setSearchMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCandidate) {
      setSearchMessage("Hãy chọn một học viên từ danh sách gợi ý trước khi thêm.");
      return;
    }

    startAddTransition(async () => {
      try {
        await addClassMemberAction({
          classId,
          userId: selectedCandidate.userId,
        });
        toast.success(`Đã thêm học viên ${selectedCandidate.fullName}`);
        setQuery("");
        setCandidates([]);
        setSelectedCandidate(null);
        setSearchMessage(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể thêm học viên");
      }
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          <Input
            value={query}
            placeholder="Tìm theo Họ và Tên, ví dụ: Nguyen Van An hoặc Nguyễn Văn An"
            className="pl-10 pr-10"
            disabled={isAdding}
            onChange={(event) => handleCandidateSearchChange(event.target.value)}
          />
          {isSearching ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[color:var(--muted-foreground)]" />
          ) : null}
        </div>

        <Button type="submit" disabled={!selectedCandidate || isAdding}>
          {isAdding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Thêm
        </Button>
      </div>

      {selectedCandidate ? (
        <div className="rounded-[14px] border border-[color:var(--primary)] bg-[color:var(--primary)]/5 px-4 py-3 text-sm">
          Đã chọn học viên <strong>{selectedCandidate.fullName}</strong> <span className="text-[color:var(--muted-foreground)]">(@{selectedCandidate.username})</span>.
        </div>
      ) : null}

      {query.trim().length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
          Gõ ít nhất 2 ký tự của Họ và Tên để tìm học viên chưa thuộc lớp này. Hệ thống hỗ trợ cả nhập có dấu và không dấu.
        </div>
      ) : candidates.length > 0 ? (
        <div className="space-y-2">
          {candidates.map((candidate) => {
            const isSelected = selectedCandidate?.userId === candidate.userId;

            return (
              <button
                key={candidate.userId}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-[14px] border px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5"
                    : "border-[color:var(--border)] bg-white hover:bg-[color:var(--muted)]",
                )}
                disabled={isAdding}
                onClick={() => handleSelectCandidate(candidate)}
              >
                <div>
                  <p className="font-medium">{candidate.fullName}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">@{candidate.username}</p>
                </div>
                {isSelected ? <span className="text-xs font-semibold text-[color:var(--primary-strong)]">Đã chọn</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-sm text-[color:var(--muted-foreground)]">
          {searchMessage ?? "Không tìm thấy học viên phù hợp."}
        </div>
      )}
    </form>
  );
}

export function SuggestRootForm({
  classId,
  rootWords,
}: {
  classId: string;
  rootWords: Array<{ id: string; root: string; meaning: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasRootWords = rootWords.length > 0;
  const form = useForm<SuggestRootFormValues>({
    resolver: zodResolver(suggestRootSchema),
    defaultValues: {
      classId,
      rootWordId: rootWords[0]?.id ?? "",
      suggestedDate: new Date().toISOString().slice(0, 10),
    },
  });
  const selectedRootWordId = useWatch({
    control: form.control,
    name: "rootWordId",
  });
  const selectedSuggestedDate = useWatch({
    control: form.control,
    name: "suggestedDate",
  });

  if (!hasRootWords) {
    return (
      <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)]/60 p-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
        Hãy xuất bản ít nhất một root word trong khu vực admin trước khi tạo gợi ý cho lớp.
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        await suggestRootAction(values);
        toast.success("Đã gợi ý từ gốc cho lớp");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tạo gợi ý mới");
      }
    });
  });

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={onSubmit}>
      <select
        className="h-10 rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
        value={selectedRootWordId}
        disabled={isPending}
        onChange={(event) => form.setValue("rootWordId", event.target.value)}
      >
        {rootWords.map((rootWord) => (
          <option key={rootWord.id} value={rootWord.id}>
            {rootWord.root} - {rootWord.meaning}
          </option>
        ))}
      </select>
      <Input
        type="date"
        value={selectedSuggestedDate}
        disabled={isPending}
        onChange={(event) => form.setValue("suggestedDate", event.target.value)}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
        Gợi ý
      </Button>
    </form>
  );
}

export function RemoveMemberButton({
  classId,
  memberId,
  memberName,
}: {
  classId: string;
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-[#ba1a1a] hover:bg-[#fff1f0] hover:text-[#93000a]">
          <Trash2 className="size-4" />
          Gỡ
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gỡ học viên khỏi lớp?</AlertDialogTitle>
          <AlertDialogDescription>
            Học viên <strong>{memberName}</strong> sẽ không còn thấy các gợi ý mới từ lớp này nữa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await removeClassMemberAction({ classId, memberId });
                  toast.success("Đã gỡ học viên khỏi lớp");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Không thể gỡ học viên khỏi lớp");
                }
              });
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Xác nhận gỡ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
