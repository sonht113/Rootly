import { CalendarPlanner } from "@/features/study-plans/components/calendar-planner";
import { getPublishedRootWords } from "@/server/repositories/root-words-repository";
import { getWeeklyCalendar } from "@/server/repositories/study-repository";

export default async function CalendarPage() {
  const [rootWords, calendar] = await Promise.all([getPublishedRootWords(), getWeeklyCalendar()]);

  return (
    <CalendarPlanner
      rootWords={rootWords.map((rootWord) => ({
        id: rootWord.id,
        root: rootWord.root,
        meaning: rootWord.meaning,
      }))}
      plans={calendar.plans}
      reviews={calendar.reviews}
    />
  );
}
