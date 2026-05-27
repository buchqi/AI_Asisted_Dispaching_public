import { AssignmentRecord } from "@/types/assignments";

export const assignmentsApi = {
  list(): AssignmentRecord[] {
    return [];
  },
  active(): AssignmentRecord[] {
    return this.list().filter((assignment) => assignment.status === "assigned");
  },
  completed(): AssignmentRecord[] {
    return this.list().filter((assignment) => assignment.status === "completed");
  }
};
