import type { AppRole, ProfileRow } from "@/types/domain";

const DEFAULT_PROFILE_NAME = "Rootly";
const DEFAULT_PROFILE_INITIALS = "RO";
const ROLE_PREFIXES = ["student.", "teacher.", "admin."] as const;

const ROLE_LABELS: Record<AppRole, string> = {
  student: "Học viên",
  teacher: "Giáo viên",
  admin: "Quản trị viên",
};

function toTitleCase(token: string) {
  return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
}

export function getProfileDisplayName(username?: string | null) {
  const normalized = username?.trim() ?? "";

  if (!normalized) {
    return DEFAULT_PROFILE_NAME;
  }

  const lowerCased = normalized.toLowerCase();
  const matchedPrefix = ROLE_PREFIXES.find((prefix) => lowerCased.startsWith(prefix));
  const strippedUsername = matchedPrefix ? normalized.slice(matchedPrefix.length) : normalized;

  const tokens = strippedUsername
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return DEFAULT_PROFILE_NAME;
  }

  return tokens.map(toTitleCase).join(" ");
}

export function getProfileRoleLabel(role: AppRole) {
  return ROLE_LABELS[role];
}

export function getProfileInitials(displayName: string) {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return DEFAULT_PROFILE_INITIALS;
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0].charAt(0)}${tokens[1].charAt(0)}`.toUpperCase();
}

export function getProfileDisplay(profile: Pick<ProfileRow, "username" | "role">) {
  const displayName = getProfileDisplayName(profile.username);

  return {
    displayName,
    roleLabel: getProfileRoleLabel(profile.role),
    initials: getProfileInitials(displayName),
  };
}
