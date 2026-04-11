const INTERNAL_EMAIL_DOMAIN = "auth.rootly.local";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function usernameToInternalEmail(username: string) {
  const normalized = normalizeUsername(username);
  return `${normalized}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function looksLikeEmail(value: string) {
  return value.includes("@");
}

export function resolveLoginIdentifier(identifier: string) {
  return looksLikeEmail(identifier)
    ? identifier.trim().toLowerCase()
    : usernameToInternalEmail(identifier);
}
