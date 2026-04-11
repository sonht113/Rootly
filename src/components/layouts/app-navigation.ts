import {
  BookOpenText,
  CalendarDays,
  ChartSpline,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Shield,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/types/domain";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navigationByRole: Record<AppRole, AppNavigationItem[]> = {
  student: [
    { href: "/today", label: "Hôm nay", icon: LayoutDashboard },
    { href: "/library", label: "Thư viện", icon: BookOpenText },
    { href: "/roots", label: "Gốc từ", icon: Languages },
    { href: "/calendar", label: "Lịch học", icon: CalendarDays },
    { href: "/reviews", label: "Ôn tập", icon: GraduationCap },
    { href: "/progress", label: "Tiến độ", icon: ChartSpline },
    { href: "/ranking", label: "Xếp hạng", icon: Trophy },
  ],
  teacher: [
    { href: "/today", label: "Hôm nay", icon: LayoutDashboard },
    { href: "/library", label: "Thư viện", icon: BookOpenText },
    { href: "/roots", label: "Gốc từ", icon: Languages },
    { href: "/calendar", label: "Lịch học", icon: CalendarDays },
    { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
    { href: "/progress", label: "Tiến độ", icon: ChartSpline },
    { href: "/ranking", label: "Xếp hạng", icon: Trophy },
  ],
  admin: [
    { href: "/today", label: "Hôm nay", icon: LayoutDashboard },
    { href: "/library", label: "Thư viện", icon: BookOpenText },
    { href: "/roots", label: "Gốc từ", icon: Languages },
    { href: "/calendar", label: "Lịch học", icon: CalendarDays },
    { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
    { href: "/admin/root-words", label: "Nội dung", icon: Shield },
    { href: "/ranking", label: "Xếp hạng", icon: Trophy },
  ],
};

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
