export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

