export function getAvatarFallback(username?: string | null) {
  const normalized = username?.trim();

  if (!normalized) {
    return "RL";
  }

  return normalized.slice(0, 2).toUpperCase();
}
