import type { AppRole } from "@/types/domain";

export const APP_ROLES: AppRole[] = ["student", "teacher", "admin"];

const ROLE_NAMESPACE_PREFIX: Record<AppRole, string> = {
  student: "",
  teacher: "/teacher",
  admin: "/admin",
};

interface RouteFamily {
  bases: Partial<Record<AppRole, string>>;
}

const ROUTE_FAMILIES: RouteFamily[] = [
  {
    bases: {
      admin: "/admin/root-words",
    },
  },
  {
    bases: {
      student: "/notifications",
      teacher: "/teacher/notifications",
      admin: "/admin/notifications",
    },
  },
  {
    bases: {
      student: "/profile",
      teacher: "/teacher/profile",
      admin: "/admin/profile",
    },
  },
  {
    bases: {
      student: "/library",
      teacher: "/teacher/library",
      admin: "/admin/library",
    },
  },
  {
    bases: {
      student: "/roots",
      teacher: "/teacher/roots",
      admin: "/admin/roots",
    },
  },
  {
    bases: {
      student: "/calendar",
      teacher: "/teacher/calendar",
      admin: "/admin/calendar",
    },
  },
  {
    bases: {
      student: "/progress",
      teacher: "/teacher/progress",
      admin: "/admin/progress",
    },
  },
  {
    bases: {
      student: "/ranking",
      teacher: "/teacher/ranking",
      admin: "/admin/ranking",
    },
  },
  {
    bases: {
      student: "/classes",
      teacher: "/teacher/classes",
      admin: "/admin/classes",
    },
  },
  {
    bases: {
      student: "/exams",
      teacher: "/teacher/exams",
      admin: "/admin/exams",
    },
  },
  {
    bases: {
      student: "/today",
    },
  },
  {
    bases: {
      student: "/reviews",
    },
  },
  {
    bases: {
      student: "/quiz",
    },
  },
];

function withRoleNamespace(role: AppRole, suffix: string) {
  const namespacePrefix = ROLE_NAMESPACE_PREFIX[role];
  return `${namespacePrefix}${suffix}` || "/";
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getPathSuffix(pathname: string, basePath: string) {
  if (pathname === basePath) {
    return "";
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }

  return null;
}

export function getRoleFromPathname(pathname?: string | null): AppRole {
  const normalizedPathname = pathname?.trim() ?? "";

  if (normalizedPathname === "/admin" || normalizedPathname.startsWith("/admin/")) {
    return "admin";
  }

  if (normalizedPathname === "/teacher" || normalizedPathname.startsWith("/teacher/")) {
    return "teacher";
  }

  return "student";
}

export function getRoleHomePath(role: AppRole) {
  switch (role) {
    case "teacher":
      return "/teacher/classes";
    case "admin":
      return "/admin/root-words";
    case "student":
    default:
      return "/today";
  }
}

export function getRoleNotificationsPath(role: AppRole) {
  return withRoleNamespace(role, "/notifications");
}

export function getRoleProfilePath(role: AppRole) {
  return withRoleNamespace(role, "/profile");
}

export function getRoleLibraryPath(role: AppRole) {
  return withRoleNamespace(role, "/library");
}

export function getRoleLibraryDetailPath(role: AppRole, rootId: string) {
  return `${getRoleLibraryPath(role)}/${rootId}`;
}

export function getRoleRootsPath(role: AppRole) {
  return withRoleNamespace(role, "/roots");
}

export function getRoleRootDetailPath(role: AppRole, rootId: string) {
  return `${getRoleRootsPath(role)}/${rootId}`;
}

export function getRoleCalendarPath(role: AppRole) {
  return withRoleNamespace(role, "/calendar");
}

export function getRoleProgressPath(role: AppRole) {
  return withRoleNamespace(role, "/progress");
}

export function getRoleRankingPath(role: AppRole) {
  return withRoleNamespace(role, "/ranking");
}

export function getRoleClassesPath(role: AppRole) {
  if (role === "student") {
    return "/classes";
  }

  return withRoleNamespace(role, "/classes");
}

export function getRoleClassDetailPath(role: AppRole, classId: string) {
  return `${getRoleClassesPath(role)}/${classId}`;
}

export function getRoleExamsPath(role: AppRole) {
  if (role === "student") {
    return "/exams";
  }

  return withRoleNamespace(role, "/exams");
}

export function getRoleExamDetailPath(role: AppRole, examId: string) {
  return `${getRoleExamsPath(role)}/${examId}`;
}

export function getAdminRootWordsPath() {
  return "/admin/root-words";
}

export function getAdminRootWordsNewPath() {
  return "/admin/root-words/new";
}

export function getCanonicalPathForRole(role: AppRole, pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return getRoleHomePath(role);
  }

  if (normalizedPathname === "/teacher" || normalizedPathname === "/admin") {
    return getRoleHomePath(role);
  }

  for (const routeFamily of ROUTE_FAMILIES) {
    for (const basePath of Object.values(routeFamily.bases)) {
      if (!basePath) {
        continue;
      }

      const suffix = getPathSuffix(normalizedPathname, basePath);
      if (suffix === null) {
        continue;
      }

      const targetBasePath = routeFamily.bases[role];
      if (!targetBasePath) {
        return getRoleHomePath(role);
      }

      const nextPathname = `${targetBasePath}${suffix}`;
      return nextPathname === normalizedPathname ? null : nextPathname;
    }
  }

  return null;
}
