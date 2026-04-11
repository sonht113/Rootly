import { Sparkles } from "lucide-react";

interface RankingTipCardProps {
  title: string;
  body: string;
}

export function RankingTipCard({ title, body }: RankingTipCardProps) {
  return (
    <section className="rounded-[32px] border border-[#6cf8bb4d] bg-[#6cf8bb33] px-6 py-6">
      <div className="flex items-center gap-3 text-[#00714d]">
        <Sparkles className="size-4" />
        <span className="text-xs font-bold tracking-[0.12em]">{title}</span>
      </div>
      <p className="mt-4 text-sm italic leading-8 text-[#00714dcc]">{body}</p>
    </section>
  );
}
