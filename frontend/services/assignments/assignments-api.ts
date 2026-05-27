import { AssignmentRecord } from "@/services/assignments/assignments-types";
import { readStoredJson } from "@/services/storage/persistence";

const assignmentsStorageKey = "freight-command-load-assignments";

export const assignmentsApi = {
  list(): AssignmentRecord[] {
    return readStoredJson<AssignmentRecord[]>(assignmentsStorageKey, []);
  },
  active(): AssignmentRecord[] {
    return this.list().filter((assignment) => assignment.status === "assigned");
  },
  completed(): AssignmentRecord[] {
    return this.list().filter((assignment) => assignment.status === "completed");
  }
};
