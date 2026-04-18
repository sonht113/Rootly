"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  navigationByRole,
  isNavigationItemActive,
} from "@/components/layouts/app-navigation";
import { cn } from "@/lib/utils/cn";
import type { AppRole } from "@/types/domain";

interface AppSidebarNavProps {
  onNavigate?: () => void;
  role: AppRole;
}

export function AppSidebarNav({ role, onNavigate }: AppSidebarNavProps) {
  const pathname = usePathname() ?? "";
  const navigation = navigationByRole[role];

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = isNavigationItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[color:var(--primary-soft)] text-[color:var(--primary-strong)]"
                : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
            )}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
