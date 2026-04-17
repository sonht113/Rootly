import {
  Bell,
  BookOpenText,
  CalendarDays,
  ChartSpline,
  ClipboardCheck,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Shield,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import {
  getRoleCalendarPath,
  getRoleClassesPath,
  getRoleExamsPath,
  getRoleHomePath,
  getRoleLibraryPath,
  getRoleNotificationsPath,
  getRoleProgressPath,
  getRoleRankingPath,
  getRoleRootsPath,
} from "@/lib/navigation/role-routes";
import type { AppRole } from "@/types/domain";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navigationByRole: Record<AppRole, AppNavigationItem[]> = {
  student: [
    { href: getRoleHomePath("student"), label: "Hôm nay", icon: LayoutDashboard },
    { href: getRoleNotificationsPath("student"), label: "Thông báo", icon: Bell },
    { href: getRoleClassesPath("student"), label: "Lớp học", icon: GraduationCap },
    { href: getRoleLibraryPath("student"), label: "Thư viện", icon: BookOpenText },
    { href: getRoleExamsPath("student"), label: "Kỳ thi", icon: ClipboardCheck },
    { href: getRoleCalendarPath("student"), label: "Lịch học", icon: CalendarDays },
    { href: "/reviews", label: "Ôn tập", icon: GraduationCap },
    { href: getRoleProgressPath("student"), label: "Tiến độ", icon: ChartSpline },
    { href: getRoleRankingPath("student"), label: "Xếp hạng", icon: Trophy },
  ],
  teacher: [
    { href: getRoleHomePath("teacher"), label: "Lớp học", icon: GraduationCap },
    { href: getRoleExamsPath("teacher"), label: "Kỳ thi", icon: ClipboardCheck },
    { href: getRoleNotificationsPath("teacher"), label: "Thông báo", icon: Bell },
    { href: getRoleLibraryPath("teacher"), label: "Thư viện", icon: BookOpenText },
    { href: getRoleRootsPath("teacher"), label: "Gốc từ", icon: Languages },
    { href: getRoleCalendarPath("teacher"), label: "Lịch học", icon: CalendarDays },
    { href: getRoleProgressPath("teacher"), label: "Tiến độ", icon: ChartSpline },
    { href: getRoleRankingPath("teacher"), label: "Xếp hạng", icon: Trophy },
  ],
  admin: [
    { href: getRoleHomePath("admin"), label: "Nội dung", icon: Shield },
    { href: getRoleNotificationsPath("admin"), label: "Thông báo", icon: Bell },
    { href: getRoleLibraryPath("admin"), label: "Thư viện", icon: BookOpenText },
    { href: getRoleRootsPath("admin"), label: "Gốc từ", icon: Languages },
    { href: getRoleClassesPath("admin"), label: "Lớp học", icon: GraduationCap },
    { href: getRoleExamsPath("admin"), label: "Kỳ thi", icon: ClipboardCheck },
    { href: getRoleCalendarPath("admin"), label: "Lịch học", icon: CalendarDays },
    { href: getRoleRankingPath("admin"), label: "Xếp hạng", icon: Trophy },
  ],
};

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
