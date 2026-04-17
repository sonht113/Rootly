import {
  getAdminRootWordsPath,
  getRoleFromPathname,
  getRoleLibraryPath,
  getRoleRootsPath,
} from "@/lib/navigation/role-routes";

interface TopbarSearchConfig {
  action: string;
  label: string;
  placeholder: string;
}

function buildDefaultConfig(pathname: string): TopbarSearchConfig {
  const role = getRoleFromPathname(pathname);

  return {
    action: getRoleLibraryPath(role),
    label: "Tìm trong thư viện",
    placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
  };
}

export function getTopbarSearchConfig(pathname?: string | null): TopbarSearchConfig {
  const normalizedPathname = pathname?.trim() || "";

  if (/^\/admin\/root-words(?:\/|$)/.test(normalizedPathname)) {
    return {
      action: getAdminRootWordsPath(),
      label: "Tìm trong nội dung từ gốc",
      placeholder: "Tìm từ gốc đang quản lý...",
    };
  }

  if (/^\/(?:teacher\/|admin\/)?roots(?:\/|$)/.test(normalizedPathname)) {
    const role = getRoleFromPathname(normalizedPathname);

    return {
      action: getRoleRootsPath(role),
      label: "Tìm trong bản đồ từ gốc",
      placeholder: "Tìm từ gốc, nghĩa hoặc nguồn gốc...",
    };
  }

  return buildDefaultConfig(normalizedPathname);
}
