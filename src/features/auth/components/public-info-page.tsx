import Link from "next/link";

type PublicInfoPageProps = {
  description: string;
  title: string;
};

export function PublicInfoPage({ description, title }: PublicInfoPageProps) {
  return (
    <section className="w-full max-w-[560px]">
      <div className="rounded-[32px] border border-black/5 bg-white px-6 py-10 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--primary-strong)]">Rootly</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">{title}</h1>
        <p className="mt-4 max-w-[46ch] text-base leading-7 text-[color:var(--muted-foreground)]">{description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-[14px] bg-[color:var(--primary-strong)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.2)] transition-colors hover:bg-[#0b63d8]"
          >
            Quay lại đăng ký
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-[14px] border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </div>
    </section>
  );
}
