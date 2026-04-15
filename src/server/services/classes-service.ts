import { getExamAvailabilityState } from "@/lib/utils/exams";
import {
  getCurrentStudentClass,
  getCurrentStudentClasses,
  getCurrentUserClassSuggestions,
  type CurrentStudentClass,
  type CurrentUserClassSuggestion,
} from "@/server/repositories/classes-repository";
import { getAccessibleExamsForCurrentUser } from "@/server/repositories/exams-repository";

type StudentClassExam = Awaited<ReturnType<typeof getAccessibleExamsForCurrentUser>>[number];

export interface StudentClassSummary extends CurrentStudentClass {
  assignmentCount: number;
  pendingAssignmentCount: number;
  examCount: number;
  openExamCount: number;
}

export interface StudentClassDetailView {
  classItem: StudentClassSummary;
  assignments: CurrentUserClassSuggestion[];
  exams: StudentClassExam[];
}

function isClassScopedExam(exam: StudentClassExam): exam is StudentClassExam & { class_id: string } {
  return exam.scope === "class" && typeof exam.class_id === "string";
}

function filterClassExams(exams: StudentClassExam[], classId: string) {
  return exams.filter((exam) => isClassScopedExam(exam) && exam.class_id === classId);
}

function buildStudentClassSummary(
  classItem: CurrentStudentClass,
  assignments: CurrentUserClassSuggestion[],
  exams: StudentClassExam[],
): StudentClassSummary {
  const openExamCount = exams.filter(
    (exam) =>
      getExamAvailabilityState({
        exam,
        attemptStatus: exam.user_attempt?.status ?? null,
      }) === "open",
  ).length;

  return {
    ...classItem,
    assignmentCount: assignments.length,
    pendingAssignmentCount: assignments.filter((assignment) => assignment.status === "pending").length,
    examCount: exams.length,
    openExamCount,
  };
}

export async function getStudentClassesOverview() {
  const [classes, assignments, exams] = await Promise.all([
    getCurrentStudentClasses(),
    getCurrentUserClassSuggestions(),
    getAccessibleExamsForCurrentUser(),
  ]);

  const assignmentsByClassId = new Map<string, CurrentUserClassSuggestion[]>();
  for (const assignment of assignments) {
    const items = assignmentsByClassId.get(assignment.classId) ?? [];
    items.push(assignment);
    assignmentsByClassId.set(assignment.classId, items);
  }

  return classes.map((classItem) =>
    buildStudentClassSummary(
      classItem,
      assignmentsByClassId.get(classItem.id) ?? [],
      filterClassExams(exams, classItem.id),
    ),
  );
}

export async function getStudentClassDetailView(classId: string): Promise<StudentClassDetailView | null> {
  const [classItem, assignments, exams] = await Promise.all([
    getCurrentStudentClass(classId),
    getCurrentUserClassSuggestions(),
    getAccessibleExamsForCurrentUser(),
  ]);

  if (!classItem) {
    return null;
  }

  const classAssignments = assignments.filter((assignment) => assignment.classId === classId);
  const classExams = filterClassExams(exams, classId);

  return {
    classItem: buildStudentClassSummary(classItem, classAssignments, classExams),
    assignments: classAssignments,
    exams: classExams,
  };
}
