import { SchedulePlanDialog } from "@/features/study-plans/components/schedule-plan-dialog";
import type { RootWordDetail } from "@/types/domain";

interface RootArtifactHeroProps {
  rootWord: RootWordDetail;
  nextReviewText: string;
}

const LANGUAGE_PATTERN = /\b(Latin|Greek|Old English|Germanic|French|Arabic|Sanskrit)\b/i;

function capitalizeLeading(text: string) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatRootDisplay(root: string) {
  const normalized = root.replace(/\s*,\s*/g, " / ").replace(/\s*\/\s*/g, " / ").trim();
  return capitalizeLeading(normalized);
}

function getArtifactLabel(description: string) {
  const language = description.match(LANGUAGE_PATTERN)?.[1] ?? "Root";
  return `GỐC TỪ ${language.toUpperCase()}`;
}

function getDerivedFromLabel(rootWord: RootWordDetail) {
  const quotedOrigin = rootWord.description.match(/['"]([^'"]+)['"]/)?.[1]?.trim();
  if (quotedOrigin) {
    return `Bắt nguồn từ '${quotedOrigin}'`;
  }

  const colonOrigin = rootWord.description
    .match(/^(?:Latin|Greek|Old English|Germanic|French|Arabic|Sanskrit)\s*:\s*([^.;,(]+)/i)?.[1]
    ?.trim();
  if (colonOrigin) {
    return `Bắt nguồn từ '${capitalizeLeading(colonOrigin)}'`;
  }

  const primaryRoot = formatRootDisplay(rootWord.root).split(" / ")[0]?.trim();
  return `Bắt nguồn từ '${primaryRoot || rootWord.root}'`;
}

function getDescriptionCopy(rootWord: RootWordDetail) {
  const description = rootWord.description.trim();
  if (description.length > 0) {
    const trimmedOriginPrefix = description.replace(
      /^(Latin|Greek|Old English|Germanic|French|Arabic|Sanskrit)\s*:\s*/i,
      "",
    );

    return capitalizeLeading(trimmedOriginPrefix);
  }

  return `Root này mở ra ${rootWord.words.length} từ liên quan và giúp bạn nhìn ra quy luật từ vựng trong tiếng Anh.`;
}

export function RootArtifactHero({ rootWord, nextReviewText }: RootArtifactHeroProps) {
  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end xl:gap-12">
      <div className="space-y-5">
        <div className="inline-flex rounded-full bg-[#6cf8bb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00714d]">
          {getArtifactLabel(rootWord.description)}
        </div>

        <div className="space-y-4">
          <h1 className="font-[family:var(--font-display)] text-[3.4rem] leading-[0.98] font-extrabold tracking-[-0.05em] text-[#191c1e] md:text-[4.5rem] xl:text-[6rem]">
            {formatRootDisplay(rootWord.root)}
          </h1>

          <div className="flex flex-col gap-3 text-lg md:flex-row md:flex-wrap md:items-center md:gap-4 xl:text-2xl">
            <p className="font-semibold text-[#0058be]">{capitalizeLeading(rootWord.meaning)}</p>
            <p className="border-l border-[#c2c6d6] pl-4 text-base italic text-[#424754] xl:text-lg">
              {getDerivedFromLabel(rootWord)}
            </p>
          </div>
        </div>

        <p className="max-w-[38rem] text-lg leading-8 text-[#424754] xl:text-[1.25rem] xl:leading-[2.05rem]">
          {getDescriptionCopy(rootWord)}
        </p>
      </div>

      <div className="flex flex-col gap-4 xl:pb-2">
        <SchedulePlanDialog
          rootWords={[
            {
              id: rootWord.id,
              root: rootWord.root,
              meaning: rootWord.meaning,
            },
          ]}
          triggerLabel="Thêm vào lịch học"
          triggerVariant="default"
          triggerClassName="h-14 w-full justify-center rounded-[12px] bg-[#0058be] px-8 text-base font-semibold text-white shadow-[0_18px_44px_rgba(0,88,190,0.22)] hover:bg-[#004ca6]"
        />
        <p className="max-w-[17.5rem] text-sm leading-5 font-medium text-[#64748b]">{nextReviewText}</p>
      </div>
    </section>
  );
}
