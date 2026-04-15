import { ClassSuggestionsPanel } from "@/features/classes/components/class-suggestions-panel";
import { getCurrentUserClassSuggestions } from "@/server/repositories/classes-repository";
import { StudentTodayDashboard } from "@/features/today-dashboard/components/student-today-dashboard";
import { getStudentTodayDashboardViewModel } from "@/features/today-dashboard/lib/get-student-today-dashboard-view-model";

export default async function TodayPage() {
  const [viewModel, classSuggestions] = await Promise.all([
    getStudentTodayDashboardViewModel(),
    getCurrentUserClassSuggestions(),
  ]);

  return <StudentTodayDashboard viewModel={viewModel} classSuggestions={<ClassSuggestionsPanel suggestions={classSuggestions} />} />;
}
