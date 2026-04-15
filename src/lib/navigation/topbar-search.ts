interface TopbarSearchConfig {
  action: string;
  label: string;
  placeholder: string;
}

const DEFAULT_TOPBAR_SEARCH_CONFIG: TopbarSearchConfig = {
  action: "/library",
  label: "Tìm trong thư viện",
  placeholder: "Tìm từ nguyên, từ gốc hoặc từ vựng...",
};

const TOPBAR_SEARCH_CONFIGS: Array<{
  matcher: RegExp;
  config: TopbarSearchConfig;
}> = [
  {
    matcher: /^\/roots(?:\/|$)/,
    config: {
      action: "/roots",
      label: "Tìm trong bản đồ từ gốc",
      placeholder: "Tìm từ gốc, nghĩa hoặc nguồn gốc...",
    },
  },
  {
    matcher: /^\/admin\/root-words(?:\/|$)/,
    config: {
      action: "/admin/root-words",
      label: "Tìm trong nội dung từ gốc",
      placeholder: "Tìm từ gốc đang quản lý...",
    },
  },
];

export function getTopbarSearchConfig(pathname?: string | null): TopbarSearchConfig {
  const normalizedPathname = pathname?.trim() || "";

  for (const entry of TOPBAR_SEARCH_CONFIGS) {
    if (entry.matcher.test(normalizedPathname)) {
      return entry.config;
    }
  }

  return DEFAULT_TOPBAR_SEARCH_CONFIG;
}
