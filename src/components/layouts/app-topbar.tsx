"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Flame, LogOut, PanelLeftOpen, Search, UserRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AppSidebarNav } from "@/components/layouts/app-sidebar-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNotificationsUnreadState } from "@/features/notifications/components/notifications-unread-provider";
import { getRoleNotificationsPath, getRoleProfilePath } from "@/lib/navigation/role-routes";
import { getTopbarSearchConfig } from "@/lib/navigation/topbar-search";
import { cn } from "@/lib/utils/cn";
import { getProfileDisplay } from "@/lib/utils/profile";
import type { ProfileRow } from "@/types/domain";

interface AppTopbarProps {
  profile: ProfileRow;
  streak: number;
  unreadNotificationCount: number;
}

function formatUnreadBadgeCount(count: number) {
  if (count > 99) {
    return "99+";
  }

  return `${count}`;
}

export function AppTopbar({ profile, streak, unreadNotificationCount }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationsUnreadState = useNotificationsUnreadState();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { displayName, initials, roleLabel } = getProfileDisplay(profile);
  const searchQuery = searchParams.get("q") ?? "";
  const searchConfig = getTopbarSearchConfig(pathname);
  const currentUnreadNotificationCount = notificationsUnreadState?.unreadCount ?? unreadNotificationCount;

  function handleOpenProfile() {
    setMobileNavOpen(false);
    router.push(getRoleProfilePath(profile.role));
  }

  async function handleLogout() {
    setMobileNavOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-white/80 px-4 py-4 shadow-sm backdrop-blur-xl md:min-h-[72px] md:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <form action={searchConfig.action} method="get" className="order-2 w-full md:order-1 md:max-w-[621px]">
            <label htmlFor="global-library-search" className="sr-only">
              {searchConfig.label}
            </label>
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mở menu điều hướng"
                  className="size-9 shrink-0 rounded-full text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              </SheetTrigger>

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  key={`${pathname ?? ""}:${searchQuery}`}
                  id="global-library-search"
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  placeholder={searchConfig.placeholder}
                  className="h-9 rounded-full border-transparent bg-slate-100/70 pl-10 pr-4 shadow-none placeholder:text-slate-500 focus-visible:bg-white"
                />
              </div>
            </div>
          </form>

          <div className="order-1 flex items-center justify-end gap-2 md:order-2 md:gap-3">
            <div className="hidden h-10 items-center gap-2 rounded-full bg-amber-50 px-3 text-sm font-semibold text-slate-600 md:flex">
              <Flame className="size-4 text-[#994100]" />
              <span>{`Chuỗi ${streak} ngày`}</span>
            </div>

            <Button asChild variant="ghost" size="icon" className="relative size-9 rounded-full text-slate-500 hover:bg-slate-100">
                <Link
                  href={getRoleNotificationsPath(profile.role)}
                  aria-label={
                    currentUnreadNotificationCount > 0
                      ? `Mở thông báo, ${currentUnreadNotificationCount} chưa đọc`
                      : "Mở thông báo"
                  }
                  title={
                    currentUnreadNotificationCount > 0
                      ? `${currentUnreadNotificationCount} thông báo chưa đọc`
                      : "Mở trung tâm thông báo"
                  }
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Bell className="size-4" />
                  {currentUnreadNotificationCount > 0 ? (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#ba1a1a] px-1 text-[10px] font-bold leading-4 text-white",
                      )}
                    >
                      {formatUnreadBadgeCount(currentUnreadNotificationCount)}
                    </span>
                  ) : null}
                </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mở menu hồ sơ"
                  className="flex items-center gap-3 rounded-full px-1 py-0.5 text-left outline-none transition hover:bg-slate-50 md:border-l md:border-[color:var(--border)] md:pl-4 md:hover:bg-transparent"
                >
                  <div className="hidden min-w-0 flex-col items-end md:flex">
                    <span className="truncate text-sm font-semibold text-slate-900">{displayName}</span>
                    <span className="text-[10px] font-medium text-slate-500">{roleLabel}</span>
                  </div>
                  <Avatar className="size-10 border border-[#0058be1a]">
                    {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-0.5 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer px-3 py-2.5 text-slate-700" onSelect={handleOpenProfile}>
                  <UserRound className="size-4" />
                  <span>Hồ sơ</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer px-3 py-2.5 text-slate-700"
                  onSelect={() => {
                    void handleLogout();
                  }}
                >
                  <LogOut className="size-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <SheetContent side="left" className="flex w-[min(100%,340px)] flex-col gap-6">
          <SheetHeader className="gap-2">
            <SheetTitle>Rootly</SheetTitle>
            <SheetDescription>Học từ gốc, theo dõi chuỗi ngày và chuyển nhanh giữa các không gian học.</SheetDescription>
          </SheetHeader>

          <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--muted)]/70 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-[#0058be1a]">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={displayName} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <AppSidebarNav role={profile.role} onNavigate={() => setMobileNavOpen(false)} />

            <Button type="button" variant="ghost" className="h-11 justify-start rounded-[16px] px-3 text-slate-700" onClick={handleOpenProfile}>
              <UserRound className="size-4" />
              <span>Hồ sơ</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="mt-auto h-11 justify-start rounded-[16px] px-3 text-slate-700"
              onClick={() => {
                void handleLogout();
              }}
            >
              <LogOut className="size-4" />
              <span>Đăng xuất</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
