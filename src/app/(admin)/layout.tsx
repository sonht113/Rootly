import { AppShell } from "@/components/layouts/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getCurrentStreak } from "@/server/repositories/study-repository";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profile, streak] = await Promise.all([requireRole(["admin"]), getCurrentStreak()]);

  return (
    <AppShell profile={profile} streak={streak}>
      {children}
    </AppShell>
  );
}
