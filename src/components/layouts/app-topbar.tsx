"use client";

import { useEffect, useState } from "react";
import { Bell, Flame, LogOut, PanelLeftOpen, Search } from "lucide-react";
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
import { getProfileDisplay } from "@/lib/utils/profile";
import type { ProfileRow } from "@/types/domain";

interface AppTopbarProps {
  profile: ProfileRow;
  streak: number;
}

export function AppTopbar({ profile, streak }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { displayName, initials, roleLabel } = getProfileDisplay(profile);
  const searchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setMobileNavOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-white/80 px-4 py-4 shadow-sm backdrop-blur-xl md:min-h-[72px] md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <form action="/library" method="get" className="order-2 w-full md:order-1 md:max-w-[621px]">
          <label htmlFor="global-library-search" className="sr-only">
            Tìm trong thư viện
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              key={`${pathname ?? ""}:${searchQuery}`}
              id="global-library-search"
              name="q"
              type="search"
              defaultValue={searchQuery}
              placeholder="Tìm từ nguyên, từ gốc hoặc từ vựng..."
              className="h-9 rounded-full border-transparent bg-slate-100/70 pl-10 pr-4 shadow-none placeholder:text-slate-500 focus-visible:bg-white"
            />
          </div>
        </form>

        <div className="order-1 flex items-center justify-between gap-2 md:order-2 md:justify-end md:gap-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mở menu điều hướng"
                className="size-9 rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            </SheetTrigger>
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
                <AppSidebarNav role={profile.role} />

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

          <div className="hidden h-10 items-center gap-2 rounded-full bg-amber-50 px-3 text-sm font-semibold text-slate-600 md:flex">
            <Flame className="size-4 text-[#994100]" />
            <span>{`Chuỗi ${streak} ngày`}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mở thông báo"
            className="relative size-9 rounded-full text-slate-500 hover:bg-slate-100"
          >
            <Bell className="size-4" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full border border-white bg-[#ba1a1a]" />
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
    </div>
  );
}
