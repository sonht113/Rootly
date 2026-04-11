import Link from "next/link";

import { AppSidebarNav } from "@/components/layouts/app-sidebar-nav";
import { AppTopbar } from "@/components/layouts/app-topbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileDisplay } from "@/lib/utils/profile";
import type { ProfileRow } from "@/types/domain";

interface AppShellProps {
  profile: ProfileRow;
  streak: number;
  children: React.ReactNode;
}

export function AppShell({ profile, streak, children }: AppShellProps) {
  const { displayName, initials, roleLabel } = getProfileDisplay(profile);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-(--border) bg-(--sidebar) px-5 py-6 lg:flex lg:flex-col">
        <Link href="/today" className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-(--primary) text-lg font-bold text-white shadow-sm">
            R
          </div>
          <div>
            <p className="text-lg font-semibold">Rootly</p>
            <p className="text-xs text-(--muted-foreground)">
              Học từ vựng qua từ gốc
            </p>
          </div>
        </Link>

        <AppSidebarNav role={profile.role} />

        <div className="mt-auto rounded-[18px] border border-(--border) bg-white p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-(--muted-foreground)">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-4/5 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <AppTopbar profile={profile} streak={streak} />
          {children}
        </div>
      </main>
    </div>
  );
}
