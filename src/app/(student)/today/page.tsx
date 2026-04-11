import { StudentTodayDashboard } from "@/features/today-dashboard/components/student-today-dashboard";
import { getStudentTodayDashboardViewModel } from "@/features/today-dashboard/lib/get-student-today-dashboard-view-model";

export default async function TodayPage() {
  const viewModel = await getStudentTodayDashboardViewModel();

  return <StudentTodayDashboard viewModel={viewModel} />;
}
