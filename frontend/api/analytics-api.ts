import { assignmentsApi } from "@/api/assignments-api";

export const analyticsApi = {
  snapshot() {
    const assignments = assignmentsApi.list();
    const completed = assignments.filter((assignment) => assignment.status === "completed");
    return {
      assigned: assignments.filter((assignment) => assignment.status === "assigned").length,
      completed: completed.length,
      averageScore: completed.length
        ? completed.reduce((total, assignment) => total + (assignment.score ?? 0), 0) / completed.length
        : 0
    };
  }
};
