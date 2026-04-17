export function getAvatarFallback(value?: string | null) {
  const tokens = (value?.trim() ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return "RL";
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
}
