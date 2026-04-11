"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle, UserPlus } from "lucide-react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addClassMemberAction, createTeacherClassAction, suggestRootAction } from "@/features/classes/actions/classes";
import { addMemberSchema, createClassSchema, suggestRootSchema } from "@/lib/validations/classes";

type CreateClassFormValues = z.input<typeof createClassSchema>;
type AddMemberFormValues = z.input<typeof addMemberSchema>;
type SuggestRootFormValues = z.input<typeof suggestRootSchema>;

export function CreateClassForm() {
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
      await createTeacherClassAction(values);
      toast.success("Đã tạo lớp học");
      form.reset();
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
  const [isPending, startTransition] = useTransition();
  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      classId,
      username: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      await addClassMemberAction(values);
      toast.success("Đã thêm học viên");
      form.reset({
        classId,
        username: "",
      });
    });
  });

  return (
    <form className="flex flex-col gap-3 md:flex-row" onSubmit={onSubmit}>
      <Input {...form.register("username")} placeholder="Thêm học viên bằng tên đăng nhập" />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Thêm
      </Button>
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
  const [isPending, startTransition] = useTransition();
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

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      await suggestRootAction(values);
      toast.success("Đã gợi ý từ gốc cho lớp");
    });
  });

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={onSubmit}>
      <select
        className="h-10 rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
        value={selectedRootWordId}
        onChange={(event) => form.setValue("rootWordId", event.target.value)}
      >
        {rootWords.map((rootWord) => (
          <option key={rootWord.id} value={rootWord.id}>
            {rootWord.root} - {rootWord.meaning}
          </option>
        ))}
      </select>
      <Input type="date" value={selectedSuggestedDate} onChange={(event) => form.setValue("suggestedDate", event.target.value)} />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
        Gợi ý
      </Button>
    </form>
  );
}
