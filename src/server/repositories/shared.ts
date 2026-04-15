export interface SupabaseErrorLike {
  message?: string;
}

export interface SupabaseQueryResult<T> {
  data: T;
  error: SupabaseErrorLike | null;
}

const HTML_ERROR_PATTERN = /<(?:!doctype|html|head|body|title|center|h1)\b/i;
const TRANSIENT_ERROR_PATTERNS = [
  "cloudflare",
  "internal server error",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  "upstream",
] as const;

function isHtmlErrorMessage(message: string) {
  return HTML_ERROR_PATTERN.test(message);
}

export function isTransientSupabaseError(error: SupabaseErrorLike | null) {
  if (!error?.message) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();

  return isHtmlErrorMessage(error.message) || TRANSIENT_ERROR_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
}

export function formatSupabaseErrorMessage(error: SupabaseErrorLike | null, fallbackMessage: string) {
  if (!error?.message) {
    return fallbackMessage;
  }

  if (isTransientSupabaseError(error)) {
    return `${fallbackMessage}. Supabase tam thoi gap su co may chu, vui long thu lai sau it phut.`;
  }

  return error.message;
}

export async function runSupabaseReadQueryWithRetry<T>(
  operation: () => PromiseLike<SupabaseQueryResult<T>>,
  maxAttempts = 2,
) {
  let attempt = 1;
  let result = await operation();

  while (attempt < maxAttempts && result.error && isTransientSupabaseError(result.error)) {
    attempt += 1;
    result = await operation();
  }

  return result;
}

export function unwrapSupabaseError(error: SupabaseErrorLike | null, fallbackMessage: string) {
  throw new Error(formatSupabaseErrorMessage(error, fallbackMessage));
}
