export function unwrapSupabaseError(error: { message?: string } | null, fallbackMessage: string) {
  if (error?.message) {
    throw new Error(error.message);
  }

  throw new Error(fallbackMessage);
}

