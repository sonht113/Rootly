import { redirect } from "next/navigation";

import { AppShell } from "@/components/layouts/app-shell";
import { requireAuth, getCurrentProfile } from "@/lib/auth/session";
import { getCurrentStreak } from "@/server/repositories/study-repository";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const [profile, streak] = await Promise.all([getCurrentProfile(), getCurrentStreak()]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <AppShell profile={profile} streak={streak}>
      {children}
    </AppShell>
  );
}
