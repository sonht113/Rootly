import {
  addDays,
  endOfWeek,
  format,
  formatDistanceToNowStrict,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";

export function formatStudyDate(date: Date | string) {
  const value = typeof date === "string" ? parseISO(date) : date;
  return format(value, "dd/MM/yyyy");
}

export function formatRelativeStudyDate(date: Date | string) {
  const value = typeof date === "string" ? parseISO(date) : date;
  return isToday(value) ? "Hôm nay" : formatDistanceToNowStrict(value, { addSuffix: true });
}

export function getWeekRange(anchor = new Date()) {
  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  };
}

export function buildReviewDates(completedAt: Date) {
  return [1, 3, 7].map((offset) => addDays(completedAt, offset));
}

