import Link from "next/link";

import { AppSidebarNav } from "@/components/layouts/app-sidebar-nav";
import { AppTopbar } from "@/components/layouts/app-topbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsRealtimeBridge } from "@/features/notifications/components/notifications-realtime-bridge";
import { NotificationsUnreadProvider } from "@/features/notifications/components/notifications-unread-provider";
import { getRoleHomePath } from "@/lib/navigation/role-routes";
import { getProfileDisplay } from "@/lib/utils/profile";
import { getCurrentUserUnreadNotificationCount } from "@/server/repositories/notifications-repository";
import type { ProfileRow } from "@/types/domain";

interface AppShellProps {
  profile: ProfileRow;
  streak: number;
  children: React.ReactNode;
}

export async function AppShell({ profile, streak, children }: AppShellProps) {
  const unreadNotificationCount = await getCurrentUserUnreadNotificationCount();
  const { displayName, initials, roleLabel } = getProfileDisplay(profile);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-(--border) bg-(--sidebar) px-5 py-6 lg:flex lg:flex-col">
        <Link href={getRoleHomePath(profile.role)} className="mb-8 flex items-center gap-3">
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
          <NotificationsUnreadProvider initialUnreadCount={unreadNotificationCount}>
            <NotificationsRealtimeBridge userId={profile.auth_user_id} />
            <AppTopbar profile={profile} streak={streak} unreadNotificationCount={unreadNotificationCount} />
            {children}
          </NotificationsUnreadProvider>
        </div>
      </main>
    </div>
  );
}
