"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveRootWordAction } from "@/features/admin-content/actions/root-words";
import { rootWordSchema, type RootWordInput } from "@/lib/validations/root-words";

interface RootWordFormProps {
  defaultValues?: RootWordInput;
}

type RootWordFormValues = z.input<typeof rootWordSchema>;

function createWord() {
  return {
    word: "",
    part_of_speech: "",
    pronunciation: "",
    meaning_en: "",
    meaning_vi: "",
    example_sentences: [
      {
        english_sentence: "",
        vietnamese_sentence: "",
        usage_context: "",
        is_daily_usage: true,
      },
    ],
  };
}

function WordEditor({
  form,
  wordIndex,
  onRemove,
}: {
  form: UseFormReturn<RootWordFormValues>;
  wordIndex: number;
  onRemove: () => void;
}) {
  const sentencesFieldArray = useFieldArray({
    control: form.control,
    name: `words.${wordIndex}.example_sentences`,
  });
  const sentences = useWatch({
    control: form.control,
    name: `words.${wordIndex}.example_sentences`,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Từ vựng #{wordIndex + 1}</CardTitle>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Từ</Label>
            <Input {...form.register(`words.${wordIndex}.word`)} placeholder="inspect" />
          </div>
          <div className="space-y-2">
            <Label>Từ loại</Label>
            <Input {...form.register(`words.${wordIndex}.part_of_speech`)} placeholder="verb" />
          </div>
          <div className="space-y-2">
            <Label>Phiên âm</Label>
            <Input {...form.register(`words.${wordIndex}.pronunciation`)} placeholder="/in-spekt/" />
          </div>
          <div className="space-y-2">
            <Label>Nghĩa tiếng Anh</Label>
            <Input {...form.register(`words.${wordIndex}.meaning_en`)} placeholder="to look at closely" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nghĩa tiếng Việt</Label>
            <Input {...form.register(`words.${wordIndex}.meaning_vi`)} placeholder="kiểm tra kỹ" />
          </div>
        </div>

        <div className="space-y-3">
          {sentencesFieldArray.fields.map((sentenceField, sentenceIndex) => (
            <div key={sentenceField.id} className="rounded-[16px] border border-[color:var(--border)] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Câu tiếng Anh</Label>
                  <Textarea
                    {...form.register(`words.${wordIndex}.example_sentences.${sentenceIndex}.english_sentence`)}
                    placeholder="Please inspect the report before sending it."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Câu tiếng Việt</Label>
                  <Textarea
                    {...form.register(`words.${wordIndex}.example_sentences.${sentenceIndex}.vietnamese_sentence`)}
                    placeholder="Hãy kiểm tra báo cáo trước khi gửi."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngữ cảnh</Label>
                  <Input
                    {...form.register(`words.${wordIndex}.example_sentences.${sentenceIndex}.usage_context`)}
                    placeholder="workplace"
                  />
                </div>
                <label className="flex items-center gap-3 pt-8 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={sentences?.[sentenceIndex]?.is_daily_usage ?? true}
                    onChange={(event) =>
                      form.setValue(
                        `words.${wordIndex}.example_sentences.${sentenceIndex}.is_daily_usage`,
                        event.target.checked,
                      )
                    }
                  />
                  Ưu tiên dùng hằng ngày
                </label>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              sentencesFieldArray.append({
                english_sentence: "",
                vietnamese_sentence: "",
                usage_context: "",
                is_daily_usage: true,
              })
            }
          >
            <PlusCircle className="size-4" />
            Thêm câu ví dụ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RootWordForm({ defaultValues }: RootWordFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<RootWordFormValues>({
    resolver: zodResolver(rootWordSchema),
    defaultValues: defaultValues ?? {
      root: "",
      meaning: "",
      description: "",
      level: "basic",
      tags: [],
      is_published: false,
      words: [createWord()],
    },
  });
  const wordsFieldArray = useFieldArray({
    control: form.control,
    name: "words",
  });
  const selectedLevel = useWatch({
    control: form.control,
    name: "level",
  });
  const selectedTags = useWatch({
    control: form.control,
    name: "tags",
  });
  const isPublished = useWatch({
    control: form.control,
    name: "is_published",
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      await saveRootWordAction(values);
      toast.success("Đã lưu từ gốc");
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Thông tin từ gốc</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Từ gốc</Label>
            <Input {...form.register("root")} placeholder="spect" />
          </div>
          <div className="space-y-2">
            <Label>Nghĩa gốc</Label>
            <Input {...form.register("meaning")} placeholder="nhìn; xem" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Giải thích</Label>
            <Textarea {...form.register("description")} placeholder="Mô tả ngắn giúp ghi nhớ từ gốc này" />
          </div>
          <div className="space-y-2">
            <Label>Cấp độ</Label>
            <select
              className="h-10 w-full rounded-[12px] border border-[color:var(--border)] bg-white px-3 text-sm"
              value={selectedLevel}
              onChange={(event) => form.setValue("level", event.target.value as RootWordFormValues["level"])}
            >
              <option value="basic">Cơ bản</option>
              <option value="intermediate">Trung cấp</option>
              <option value="advanced">Nâng cao</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Thẻ</Label>
            <Input
              value={Array.isArray(selectedTags) ? selectedTags.join(", ") : ""}
              onChange={(event) =>
                form.setValue(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
              placeholder="daily-use, workplace, beginner"
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-[color:var(--border)]"
              checked={isPublished}
              onChange={(event) => form.setValue("is_published", event.target.checked)}
            />
            Xuất bản ngay sau khi lưu
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {wordsFieldArray.fields.map((wordField, wordIndex) => (
          <WordEditor key={wordField.id} form={form} wordIndex={wordIndex} onRemove={() => wordsFieldArray.remove(wordIndex)} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => wordsFieldArray.append(createWord())}>
          <PlusCircle className="size-4" />
          Thêm từ vựng
        </Button>
        <Button type="submit" variant="accent" disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Đang lưu..." : "Lưu nội dung"}
        </Button>
      </div>
    </form>
  );
}
