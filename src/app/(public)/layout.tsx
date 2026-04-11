export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="surface-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[color:var(--primary-soft)] blur-3xl" />
      <div className="absolute bottom-8 right-8 h-48 w-48 rounded-full bg-[color:var(--accent-soft)] blur-3xl" />
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">{children}</main>
    </div>
  );
}

