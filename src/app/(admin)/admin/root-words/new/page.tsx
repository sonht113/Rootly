import { PageHeader } from "@/components/shared/page-header";
import { RootWordForm } from "@/features/admin-content/components/root-word-form";
import { getRootWordDetail } from "@/server/repositories/root-words-repository";

export default async function AdminRootWordNewPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const rootWord = params.edit ? await getRootWordDetail(params.edit) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title={rootWord ? `Chỉnh sửa ${rootWord.root}` : "Tạo từ gốc mới"}
        description="Quản lý từ gốc, danh sách từ vựng, câu ví dụ và trạng thái xuất bản trong cùng một biểu mẫu."
      />
      <RootWordForm
        defaultValues={
          rootWord
            ? {
                id: rootWord.id,
                root: rootWord.root,
                meaning: rootWord.meaning,
                description: rootWord.description,
                level: rootWord.level,
                tags: rootWord.tags,
                is_published: rootWord.is_published,
                words: rootWord.words.map((word) => ({
                  id: word.id,
                  word: word.word,
                  part_of_speech: word.part_of_speech,
                  pronunciation: word.pronunciation ?? "",
                  meaning_en: word.meaning_en,
                  meaning_vi: word.meaning_vi,
                  example_sentences: word.example_sentences.map((sentence) => ({
                    english_sentence: sentence.english_sentence,
                    vietnamese_sentence: sentence.vietnamese_sentence,
                    usage_context: sentence.usage_context ?? "",
                    is_daily_usage: sentence.is_daily_usage,
                  })),
                })),
              }
            : undefined
        }
      />
    </div>
  );
}
